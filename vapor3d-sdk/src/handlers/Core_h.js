import { Utils, WebGL, GLState, Shader, Framebuffer, VAO, Texture2D, TextureCube } from '../lib/Core.js';

export class Vapor3DCore {
    constructor(vm) {
        this.vm = vm;
        this.webgl = null;
        this.state = null;
        
        this.shaders = new Map();
        this.fbos = new Map();
        this.vaos = new Map();
        this.textures = new Map();

        this.models = new Map(); 
    }

    // ==========================================
    // 环境
    // ==========================================
    gl_Init() {
        if (!this.webgl) {
            this.webgl = new WebGL(this.vm.renderer);
            this.state = new GLState(this.webgl, this.vm.runtime);
        }
        this.webgl.init();
    }

    gl_ResetResources() {
        this.shaders.forEach(s => s.destroy()); this.shaders.clear();
        this.fbos.forEach(f => f.destroy()); this.fbos.clear();
        this.vaos.forEach(v => v.destroy()); this.vaos.clear();
        this.textures.forEach(t => { if(t !== "loading") t.destroy(); }); this.textures.clear();
        if(window.V3D_Exchange) window.V3D_Exchange.models = {};
    }

    // 动态菜单
    tex_getCostumes() {
        if (!this.vm) return ["waiting vm"];

        const target = this.vm.runtime && this.vm.runtime.getEditingTarget
            ? this.vm.runtime.getEditingTarget()
            : this.vm.editingTarget;

        if (!target || !target.getCostumes) {
            return ["NONE"];
        }

        return target.getCostumes().map(e => e.name);
    }
    getAllLists() { 
        const stage = vm.runtime.getTargetForStage();
        const editingTarget = vm.editingTarget || stage;
        const lists = ["NONE"];
        // find in Sprite
        if (editingTarget && editingTarget.variables) {
            Object.values(editingTarget.variables)
                .filter(v => v.type === 'list')
                .forEach(v => lists.push(v.name));
        }
        // find in stage
        if (stage && stage !== editingTarget && stage.variables) {
            Object.values(stage.variables)
                .filter(v => v.type === 'list')
                .forEach(v => {
                    if (!lists.includes(v.name)) lists.push(v.name);
                });
        }

        return lists;
    }

    // ==========================================
    // Shaders
    // ==========================================
    shader_Create({ ID, VS, FS }) {
        if (!this.webgl || this.shaders.has(ID)) return;
        const shader = new Shader(this.webgl.gl, VS, FS);
        if(shader.program) this.shaders.set(ID, shader);
    }
    shader_Use({ ID }) { const s = this.shaders.get(ID); if (s) s.use(); }
    shader_SetMat4({ ID, NAME, VAL }, util) { const s = this.shaders.get(ID); const m = Utils.parseInput(VAL, util); if (s && m) s.setMat4(NAME, m); }
    shader_SetVec3({ ID, NAME, X, Y, Z }) { const s = this.shaders.get(ID); if (s) s.setVec3(NAME, X, Y, Z); }
    shader_SetVec2({ ID, NAME, X, Y }) { const s = this.shaders.get(ID); if (s) { s.use(); s.setVec2(NAME, X, Y); } }
    shader_SetFloat({ ID, NAME, V }) { const s = this.shaders.get(ID); if (s) { s.use(); s.setFloat(NAME, V); } }
    shader_SetInt({ ID, NAME, V }) { const s = this.shaders.get(ID); if (s) s.setInt(NAME, V); }

    // ==========================================
    // FBO
    // ==========================================
    fbo_Create({ ID }) { if (this.webgl && !this.fbos.has(ID)) this.fbos.set(ID, new Framebuffer(this.webgl.gl)); }
    fbo_AttachTexture({ ID, TEX, SLOT }) {
        const fbo = this.fbos.get(ID);
        const tex = this.textures.get(TEX);
        if (fbo && tex && tex !== "loading") fbo.attachTexture(tex, SLOT);
    }
    fbo_Bind({ ID }) {
        if (!this.webgl) return;
        const gl = this.webgl.gl;
        const canvas3d = this.webgl.canvas;
        const fbo = this.fbos.get(ID);

        if (fbo) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.id);
            const vW = fbo.width || canvas3d.width || 480;
            const vH = fbo.height || canvas3d.height || 360;
            gl.viewport(0, 0, vW, vH);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas3d.width, canvas3d.height);
        }
    }
    // ==========================================
    // VAO
    // ==========================================
    vao_CreateScreenQuad({ ID }) {
        if (!this.webgl) return;
        const gl = this.webgl.gl;
        this.vao_Destroy({ ID });

        const vao = new VAO(gl);
        const pos = [-1, 1, 0, -1, -1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0];
        const uv = [0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0];

        vao.addBuffer(new Float32Array(pos), 0, 3);
        vao.addBuffer(new Float32Array(uv), 1, 2);

        vao.defaultCount = 6;
        vao.hasElements = false;

        this.vaos.set(ID, vao);
    }
    vao_CreateCube({ ID }) {
        if (!this.webgl) return;
        const gl = this.webgl.gl;
        this.vao_Destroy({ ID });

        const vao = new VAO(gl);
        const v = [
            -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
            -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1
        ];
        const indices = [
            0, 1, 2, 2, 3, 0, 1, 5, 6, 6, 2, 1, 5, 4, 7, 7, 6, 5,
            4, 0, 3, 3, 7, 4, 3, 2, 6, 6, 7, 3, 4, 5, 1, 1, 0, 4
        ];

        vao.addBuffer(new Float32Array(v), 0, 3);
        vao.setIndices(new Uint16Array(indices));

        vao.defaultCount = 36;
        vao.hasElements = true;

        this.vaos.set(ID, vao);
    }
    vao_CreateSphere(args) {
        const ID = String(args.ID);
        if (!this.webgl) return;
        const gl = this.webgl.gl;
        this.vao_Destroy({ ID });

        const latBands = Math.max(3, parseInt(args.LAT) || 16);
        const lonBands = Math.max(3, parseInt(args.LON) || 16);
        const pos = [];
        const indices = [];
        for (let i = 0; i <= latBands; i++) {
            const theta = (i * Math.PI) / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            for (let j = 0; j <= lonBands; j++) {
                const phi = (j * 2 * Math.PI) / lonBands;
                pos.push(Math.cos(phi) * sinTheta, cosTheta, Math.sin(phi) * sinTheta);
            }
        }
        for (let i = 0; i < latBands; i++) {
            for (let j = 0; j < lonBands; j++) {
                const first = i * (lonBands + 1) + j;
                const second = first + lonBands + 1;
                indices.push(first, first + 1, second, second, first + 1, second + 1);
            }
        }

        const vao = new VAO(gl);
        vao.addBuffer(new Float32Array(pos), 0, 3);
        vao.setIndices(new Uint16Array(indices));

        vao.defaultCount = indices.length;
        vao.hasElements = true;

        this.vaos.set(ID, vao);
    }
    vao_CreateEmpty({ ID }) { if (this.webgl) { this.vao_Destroy({ ID }); this.vaos.set(ID, new VAO(this.webgl.gl)); } }

    vao_Destroy({ ID }) { const v = this.vaos.get(ID); if (v) { v.destroy(); this.vaos.delete(ID); } }

    // ==========================================
    // Texture
    // ==========================================
    tex_CreateEmpty({ NAME, W, H, FORMAT }) {
        if (!this.webgl || this.textures.has(NAME)) return;
        const conf = Utils.getFormatConfig(this.webgl.gl, FORMAT); // 一个很阴的坑，我忘记在构造函数里给 this.gl 赋值了
        const tex = new Texture2D(this.webgl.gl);
        tex.uploadEmpty(W, H, conf.internal, conf.format, conf.type);
        this.textures.set(NAME, tex);
    }
    async tex_LoadFromCostume({ C, NAME }, { target }) {
        if (!this.webgl || this.textures.has(NAME)) return;
        const cost = target.sprite.costumes.find(c => c.name === C);
        if (!cost) return;
        this.textures.set(NAME, "loading");
        try {
            const blob = new Blob([cost.asset.data], { type: cost.asset.assetType.contentType });
            const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
            const tex = new Texture2D(this.webgl.gl);
            tex.uploadImageBitmap(bitmap);
            bitmap.close();
            this.textures.set(NAME, tex);
        } catch (e) { this.textures.delete(NAME); }
    }
    async tex_LoadFromURL({ U, NAME }) {
        if (!this.webgl || this.textures.has(NAME) || !U.trim()) return;
        this.textures.set(NAME, "loading");
        try {
            const data = await this.Utils.fetchBinary(U);
            const bitmap = await createImageBitmap(new Blob([data]), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
            const tex = new Texture2D(this.webgl.gl);
            tex.uploadImageBitmap(bitmap);
            bitmap.close();
            this.textures.set(NAME, tex);
        } catch (e) { this.textures.delete(NAME); }
    }
    async tex_LoadKTXFromURL({ U, NAME }) {
        if (!this.webgl || this.textures.has(NAME) || !String(U).trim()) return;

        this.textures.set(NAME, "loading");
        console.log(`%c[Vapor3D] Loading KTX: ${NAME}`, "color: #f5a623;");

        try {
            const data = await this.Utils.fetchBinary(U);
            const ktxData = this.Utils.parseKTX(data.buffer);

            const tex = new TextureCube(this.webgl.gl);
            tex.uploadKTX(ktxData);

            this.textures.set(NAME, tex);
            console.log(`%c[Vapor3D] KTX Loaded Successfully: ${NAME}`, "color: #00ff00;");
        } catch (e) {
            this.textures.delete(NAME);
            console.error(`[Vapor3D] KTX Load Error (${NAME}):`, e);
        }
    }
    tex_Destroy({ NAME }) { const t = this.textures.get(NAME); if (t && t !== "loading") { t.destroy(); this.textures.delete(NAME); } }
    gl_BindTexture({ TEX, UNIT }) { const t = this.textures.get(TEX); if (t && t !== "loading") t.bind(UNIT); else if(this.webgl) { this.webgl.gl.activeTexture(this.webgl.gl.TEXTURE0+UNIT); this.webgl.gl.bindTexture(this.webgl.gl.TEXTURE_2D, null); } }
    gl_BindCubemap({ TEX, UNIT }) { const t = this.textures.get(TEX); if (t && t !== "loading") t.bind(UNIT); else if(this.webgl) { this.webgl.gl.activeTexture(this.webgl.gl.TEXTURE0+UNIT); this.webgl.gl.bindTexture(this.webgl.gl.TEXTURE_CUBE_MAP, null); } }
    tex_GenerateMipmap({ TEX }) { const t = this.textures.get(TEX); if (t && t !== "loading") t.generateMipmap(); }
    tex_SetFilter({ TEX, MODE }) { const t = this.textures.get(TEX); if (t && t !== "loading") { const p = MODE.split('_'); t.setFilter(p[0], p.length>1 ? MODE : p[0]); } }
    tex_SetWrap({ TEX, AXIS, MODE }) { const t = this.textures.get(TEX); if (t && t !== "loading") t.setWrap(AXIS, MODE); }

    // ==========================================
    // GLState
    // ==========================================
    gl_Clear({ BIT }) { if (this.state) this.state.clear(BIT); }
    gl_SetClearColor({ R, G, B, A }) { if (this.state) this.state.setClearColor(R, G, B, A); }
    gl_Present() { if (this.state) return this.state.present(); }
    gl_Draw({ ID, COUNT, MODE }) {
        const v = this.vaos.get(ID);
        if (!v) {
            console.error(`[Vapor3D] cant find VAO "${ID}"`);
            console.warn("当前可用的 VAO:", Array.from(this.vaos.keys()));
            return;
        }

        let drawCount = Number(COUNT);
        if (isNaN(drawCount) || drawCount <= 0 || COUNT === "") {
            drawCount = v.defaultCount;
        }

        if (drawCount === 0) {
            console.warn(`[Vapor3D]Invalid VAO "${ID}"`);
            return;
        }

        v.draw(MODE, drawCount);
    }
    st_Enable({ CAP }) { if (this.state) this.state.enable(CAP); }
    st_Disable({ CAP }) { if (this.state) this.state.disable(CAP); }
    st_CullFace({ MODE }) { if (this.state) this.state.cullFace(MODE); }
    st_ColorMask({ STATE }) { if (this.state) { const b = STATE === "true"; this.state.colorMask(b, b, b, b); } }
    st_BlendFuncSeparate(args) { if (this.state) this.state.blendFuncSeparate(args.SRGB, args.DRGB, args.SA, args.DA); }
    st_DepthMask({ STATE }) { if (this.state) this.state.depthMask(STATE === "true"); }
    st_DepthFunc({ FUNC }) { if (this.state) this.state.depthFunc(FUNC); }
    st_StencilMask({ MASK }) { if (this.state) this.state.stencilMask(parseInt(MASK) || 0xFF); }
    st_StencilOp({ FACE, SF, DF, DP }) { if (this.state) this.state.stencilOp(FACE, SF, DF, DP); }
    st_StencilFunc({ FACE, FUNC, REF, MASK }) { if (this.state) this.state.stencilFunc(FACE, FUNC, parseInt(REF) || 0, parseInt(MASK) || 0xFF); }
}