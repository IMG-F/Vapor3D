export class Utils {

    // 解析 Scratch 输入 JSON 数组字符串或 Scratch 列表名
    static parseInput(input, util) {
        if (typeof input === "string" && input.startsWith("[")) {
            try { return JSON.parse(input); } catch (e) { return null; }
        }
        // 如果 input 是列表名，从 Scratch 运行时查找
        const list = util.target.lookupVariableByNameAndType(input, "list");
        return list ? list.value.map(Number) : null;
    }

    static async fetchBinary(url) {
        if (url.startsWith('data:')) {
            const b64 = url.split(',').pop();
            const binStr = atob(b64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            return bytes;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
    }

    static getFormatConfig(gl, formatStr) {
        if (!gl) return null;
        const key = String(formatStr).toUpperCase().trim();
        const map = {
            "RGB16F": { internal: gl.RGB16F, format: gl.RGB, type: gl.HALF_FLOAT },
            "RGBA16F": { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT },
            "RGB32F": { internal: gl.RGB32F, format: gl.RGB, type: gl.FLOAT },
            "RGB8": { internal: gl.RGB8, format: gl.RGB, type: gl.UNSIGNED_BYTE },
            "RGBA8": { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE },
            "R11G11B10F": { internal: gl.R11F_G11F_B10F, format: gl.RGB, type: gl.FLOAT },
            "R16F": { internal: gl.R16F, format: gl.RED, type: gl.HALF_FLOAT },
            "RG16F": { internal: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT },
            "DEPTH24_STENCIL8": { internal: gl.DEPTH24_STENCIL8, format: gl.DEPTH_STENCIL, type: gl.UNSIGNED_INT_24_8 },
            "DEPTH_COMPONENT24": { internal: gl.DEPTH_COMPONENT24, format: gl.DEPTH_COMPONENT, type: gl.UNSIGNED_INT }
        };
        return map[key] || map["RGBA8"];
    }

    /**
     * KTX 1.0 
     */
    static parseKTX(buffer) {
        const bytes = new Uint8Array(buffer);
        const identifier = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

        for (let i = 0; i < 12; i++) {
            if (bytes[i] !== identifier[i]) throw new Error("Vapor3D: Not a valid KTX 1.0 file");
        }

        const dv = new DataView(buffer);
        const littleEndian = dv.getUint32(12, true) === 0x04030201;

        const glType = dv.getUint32(16, littleEndian);
        const glFormat = dv.getUint32(24, littleEndian);
        const glInternalFormat = dv.getUint32(28, littleEndian);
        const pixelWidth = dv.getUint32(36, littleEndian);
        const pixelHeight = dv.getUint32(40, littleEndian);
        const numberOfFaces = dv.getUint32(52, littleEndian);
        let numberOfMipmapLevels = dv.getUint32(56, littleEndian);
        const bytesOfKeyValueData = dv.getUint32(60, littleEndian);

        if (numberOfFaces !== 6) throw new Error("Vapor3D: KTX must be a Cubemap (6 faces)");
        if (numberOfMipmapLevels === 0) numberOfMipmapLevels = 1;

        let offset = 64 + bytesOfKeyValueData;
        const mipmaps = [];

        for (let mip = 0; mip < numberOfMipmapLevels; mip++) {
            const imageSize = dv.getUint32(offset, littleEndian);
            offset += 4;

            for (let face = 0; face < numberOfFaces; face++) {
                const faceBuffer = buffer.slice(offset, offset + imageSize);
                let dataArray;

                // 映射 TypedArray
                if (glType === 5126) dataArray = new Float32Array(faceBuffer); // FLOAT
                else if (glType === 5131 || glType === 36193) dataArray = new Uint16Array(faceBuffer); // HALF_FLOAT
                else dataArray = new Uint8Array(faceBuffer);

                mipmaps.push({
                    level: mip,
                    face: face,
                    width: Math.max(1, pixelWidth >> mip),
                    height: Math.max(1, pixelHeight >> mip),
                    data: dataArray
                });

                offset += imageSize;
                offset = (offset + 3) & ~3;
            }
            offset = (offset + 3) & ~3;
        }

        return { glInternalFormat, glFormat, glType, numberOfMipmapLevels, mipmaps };
    }
}

// ==========================================
// WebGL 环境
// ==========================================
export class WebGL {
    constructor(renderer) {
        this.renderer = renderer;
        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true, depth: true, stencil: true, antialias: false,
            preserveDrawingBuffer: true, powerPreference: 'high-performance'
        });
        this.originalDraw = null;
        this.isTakenOver = false;
    }

    init() {
        const mainCanvas = this.renderer.canvas;
        if (!mainCanvas || !mainCanvas.parentElement) return;

        this.canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:0;';
        if (!['relative', 'absolute'].includes(mainCanvas.parentElement.style.position)) {
            mainCanvas.parentElement.style.position = 'relative';
        }
        if (!this.canvas.parentElement) mainCanvas.after(this.canvas);

        this.resize();
        this.gl.getExtension('OES_texture_float_linear');
        this.gl.getExtension('OES_texture_half_float_linear');
        this.gl.getExtension('EXT_color_buffer_float');

        // 劫持渲染器
        if (!this.originalDraw) {
            this.originalDraw = this.renderer.draw.bind(this.renderer);
            this.renderer.draw = () => { if (!this.isTakenOver) this.originalDraw(); };
        }
        this.isTakenOver = true;
    }

    resize() {
        if (this.canvas.width !== this.renderer.canvas.width || this.canvas.height !== this.renderer.canvas.height) {
            this.canvas.width = this.renderer.canvas.width;
            this.canvas.height = this.renderer.canvas.height;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    destroy() {
        this.isTakenOver = false;
        if (this.canvas.parentElement) this.canvas.remove();
    }
}

// ==========================================
// GLState
// ==========================================
export class GLState {
    constructor(webgl, runtime) {
        this.webgl = webgl;
        this.gl = webgl.gl;
        this.runtime = runtime;
    }

    clear(maskMode) {
        const gl = this.gl;
        const mask = (maskMode === "ALL") ? (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT) : gl[maskMode];
        gl.clear(mask);
    }

    setClearColor(r, g, b, a) { this.gl.clearColor(r, g, b, a); }

    present() {
        this.webgl.resize(); // 分辨率同步
        this.runtime.requestRedraw();
        // 对齐 V-Sync
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    enable(cap) { this.gl.enable(this.gl[cap]); }
    disable(cap) { this.gl.disable(this.gl[cap]); }
    cullFace(mode) { this.gl.cullFace(this.gl[mode]); }
    depthMask(state) { this.gl.depthMask(state); }
    depthFunc(func) { this.gl.depthFunc(this.gl[func]); }
    colorMask(r, g, b, a) { this.gl.colorMask(r, g, b, a); }
    blendFuncSeparate(srgb, drgb, sa, da) { this.gl.blendFuncSeparate(this.gl[srgb], this.gl[drgb], this.gl[sa], this.gl[da]); }

    stencilOp(face, sf, zf, zp) { this.gl.stencilOpSeparate(this.gl[face], this.gl[sf], this.gl[zf], this.gl[zp]); }
    stencilFunc(face, func, ref, mask) { this.gl.stencilFuncSeparate(this.gl[face], this.gl[func], ref, mask); }
    stencilMask(mask) { this.gl.stencilMask(mask); }
}

// ==========================================
// Shader
// ==========================================
export class Shader {
    constructor(gl, vsSource, fsSource) {
        this.gl = gl;
        this.program = gl.createProgram();

        const vSrc = this._fixGLSL(vsSource);
        const fSrc = this._fixGLSL(fsSource);

        const vShader = this._compile(gl.VERTEX_SHADER, vSrc);
        const fShader = this._compile(gl.FRAGMENT_SHADER, fSrc);

        if (!vShader || !fShader) return;

        gl.attachShader(this.program, vShader);
        gl.attachShader(this.program, fShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("Shader Link Error:", gl.getProgramInfoLog(this.program));
        }
    }

    _fixGLSL(src) {
        if (!src) return "";
        let s = src.trim();

        // 移除注释
        s = s.replace(/\/\*[\s\S]*?\*\//g, '');
        s = s.replace(/\/\/.*/g, (match) => match + "\n");

        // 强制 #version 300 es 独占一行
        if (s.includes('#version')) {
            s = s.replace(/(#version\s+300\s+es)\s*/, "$1\n");
        }

        // 补全换行符
        const lineCount = (s.match(/\n/g) || []).length;
        if (lineCount < 3) {
            s = s.replace(/;/g, ";\n")
                .replace(/{/g, "{\n")
                .replace(/}/g, "}\n");
        }

        return s.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
    }

    _compile(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const typeName = type === this.gl.VERTEX_SHADER ? "Vertex" : "Fragment";
            console.error(`Vapor3D ${typeName} Shader Error:`, this.gl.getShaderInfoLog(shader));
            console.log("Processed GLSL Source:", "\n" + source);
            return null;
        }
        return shader;
    }

    use() { this.gl.useProgram(this.program); }

    setMat4(name, mat) { this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, name), false, new Float32Array(mat)); }
    setVec3(name, x, y, z) { this.gl.uniform3f(this.gl.getUniformLocation(this.program, name), x, y, z); }
    setVec2(name, x, y) { this.gl.uniform2f(this.gl.getUniformLocation(this.program, name), x, y); }
    setFloat(name, val) { this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), val); }
    setInt(name, val) { this.gl.uniform1i(this.gl.getUniformLocation(this.program, name), val); }

    destroy() { this.gl.deleteProgram(this.program); }
}

// ==========================================
// Framebuffer
// ==========================================
export class Framebuffer {
    constructor(gl) {
        this.gl = gl;
        this.id = gl.createFramebuffer();
        this.width = 0;
        this.height = 0;
        this.activeSlots = []; // 存储 ATTACHMENT 等
    }

    attachTexture(texture, slot) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.id);
        const point = this.gl[slot];

        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, point, texture.target, texture.id, 0);

        if (texture.width && texture.height) {
            this.width = texture.width;
            this.height = texture.height;
        }

        if (slot.startsWith("COLOR_ATTACHMENT")) {
            if (!this.activeSlots.includes(point)) {
                this.activeSlots.push(point);
                this.activeSlots.sort((a, b) => a - b);
                this.gl.drawBuffers(this.activeSlots);
            }
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    bind(fallbackW, fallbackH) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.id);
        const w = this.width || fallbackW;
        const h = this.height || fallbackH;
        this.gl.viewport(0, 0, w, h);
    }

    static bindScreen(gl, canvasW, canvasH) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvasW, canvasH);
    }

    destroy() { this.gl.deleteFramebuffer(this.id); }
}

// ==========================================
// VAO
// ==========================================
export class VAO {
    constructor(gl) {
        this.gl = gl;
        this.id = gl.createVertexArray();
        this.vbos = [];
        this.ebo = null;
        this.hasElements = false;
        this.defaultCount = 0;
        this.elementType = gl.UNSIGNED_SHORT;
    }

    bind() { this.gl.bindVertexArray(this.id); }
    unbind() { this.gl.bindVertexArray(null); }

    addBuffer(dataArray, location, size, type = this.gl.FLOAT) {
        this.bind();
        const vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, dataArray, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, size, type, false, 0, 0);
        this.vbos.push(vbo);
        if (!this.hasElements && location === 0) {
            this.defaultCount = dataArray.length / size;
        }
        this.unbind();
    }

    setIndices(indicesArray, isUint32 = false) {
        this.bind();
        this.ebo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indicesArray, this.gl.STATIC_DRAW);
        this.hasElements = true;
        this.defaultCount = indicesArray.length;
        this.elementType = isUint32 ? this.gl.UNSIGNED_INT : this.gl.UNSIGNED_SHORT;
        this.unbind();
    }

    draw(modeName, count = -1) {
        if (this.defaultCount === 0) return;
        this.bind();
        const drawCount = (count <= 0) ? this.defaultCount : count;
        const glMode = this.gl[modeName] || this.gl.TRIANGLES;

        if (this.hasElements) {
            this.gl.drawElements(glMode, drawCount, this.elementType, 0);
        } else {
            this.gl.drawArrays(glMode, 0, drawCount);
        }
        this.unbind();
    }

    destroy() {
        this.vbos.forEach(b => this.gl.deleteBuffer(b));
        if (this.ebo) this.gl.deleteBuffer(this.ebo);
        this.gl.deleteVertexArray(this.id);
    }
}

// ==========================================
// Texture
// ==========================================
export class Texture {
    constructor(gl) {
        this.gl = gl;
        this.id = gl.createTexture();
        this.target = gl.TEXTURE_2D;
    }

    bind(unit = 0) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.target, this.id);
    }

    setFilter(minMode, magMode) {
        this.bind();
        this.gl.texParameteri(this.target, this.gl.TEXTURE_MIN_FILTER, this.gl[minMode]);
        this.gl.texParameteri(this.target, this.gl.TEXTURE_MAG_FILTER, this.gl[magMode]);
    }

    setWrap(axis, mode) {
        this.bind();
        const axisMap = { "S": this.gl.TEXTURE_WRAP_S, "T": this.gl.TEXTURE_WRAP_T, "R": this.gl.TEXTURE_WRAP_R };
        const modeMap = { "REPEAT": this.gl.REPEAT, "CLAMP_TO_EDGE": this.gl.CLAMP_TO_EDGE, "MIRRORED_REPEAT": this.gl.MIRRORED_REPEAT };
        this.gl.texParameteri(this.target, axisMap[axis], modeMap[mode]);
    }

    generateMipmap() {
        this.bind();
        this.gl.generateMipmap(this.target);
    }

    destroy() { this.gl.deleteTexture(this.id); }
}

export class Texture2D extends Texture {
    constructor(gl) {
        super(gl);
        this.target = gl.TEXTURE_2D;
    }

    uploadEmpty(w, h, internalFormat, format, type) {
        this.bind();
        this.gl.texImage2D(this.target, 0, internalFormat, w, h, 0, format, type, null);
        this.width = w;
        this.height = h;
        this.setFilter("LINEAR", "LINEAR");
        this.setWrap("S", "CLAMP_TO_EDGE");
        this.setWrap("T", "CLAMP_TO_EDGE");
    }

    uploadImageBitmap(bitmap) {
        this.bind();
        this.gl.texImage2D(this.target, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmap);
        this.width = bitmap.width;
        this.height = bitmap.height;
        this.setFilter("LINEAR", "LINEAR");
        this.setWrap("S", "REPEAT");
        this.setWrap("T", "REPEAT");
    }
}

export class TextureCube extends Texture {
    constructor(gl) {
        super(gl);
        this.target = gl.TEXTURE_CUBE_MAP;
    }

    /**
     * @param {Object} ktx - glInternalFormat, glFormat, glType, mipmaps
     */
    uploadKTX(ktx) {
        const gl = this.gl;
        this.bind();

        //  4 字节对齐
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

        ktx.mipmaps.forEach(mip => {
            const targetFace = gl.TEXTURE_CUBE_MAP_POSITIVE_X + mip.face;
            gl.texImage2D(
                targetFace,
                mip.level,
                ktx.glInternalFormat,
                mip.width,
                mip.height,
                0,
                ktx.glFormat,
                ktx.glType,
                mip.data
            );
        });

        // 以前的坑， Mipmap 层级范围限制
        const mipCount = ktx.numberOfMipmapLevels;
        gl.texParameteri(this.target, gl.TEXTURE_MAX_LEVEL, mipCount - 1);
        
        const minFilter = (mipCount > 1) ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR;
        gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(this.target, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    }
}