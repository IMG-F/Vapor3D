// Name: Vapor 3D
// ID: vapor3D
// Description: 3D Engine for Turbowarp
// By: Joy_Ful <https://github.com/JoyFul721>
// License: MPL-2.0 AND BSD-3-Clause
// Version: 1.3.0 - Stencil Logic & Remote Asset Unpacking

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) throw new Error("Vapor 3D must run unsandboxed");

  const vm = Scratch.vm;
  const renderer = vm.renderer;
  const runtime = vm.runtime;

  // ==========================================
  // 独立 WebGL
  // ==========================================
  let originalDraw = null;
  let isTakenOver = false;
  const canvas3d = document.createElement('canvas');
  const gl3d = canvas3d.getContext('webgl2', {
    alpha: true,
    depth: true,
    stencil: true,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });


  const debugInfo = gl3d.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const vendor = gl3d.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl3d.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    console.log(vendor);
    console.log(renderer);
  }

  // ==========================================
  // 独立 Canvas3d
  // ==========================================
  const shaders = new Map();
  const vaos = new Map();
  const fbos = new Map();
  const textures = new Map();
  const vbos = [];
  const rbos = [];

  const vectors = new Map();

  function initCanvasOverlay() {
    const mainCanvas = renderer.canvas;
    if (!mainCanvas) return;
    const container = mainCanvas.parentElement;
    if (!container) return;

    canvas3d.style.position = 'absolute';
    canvas3d.style.left = '0';
    canvas3d.style.top = '0';
    canvas3d.style.width = '100%';
    canvas3d.style.height = '100%';
    canvas3d.style.pointerEvents = 'none';
    canvas3d.style.imageRendering = 'pixelated';

    // zIndex 排序，0不会覆盖变量
    canvas3d.style.zIndex = '0';

    if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
      container.style.position = 'relative';
    }

    if (!canvas3d.parentElement) {
      mainCanvas.after(canvas3d);
    }
  }

  // ==========================================
  // m4
  // ==========================================
  const m4 = {
    identity: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    perspective: (fovy, aspect, near, far) => {
      const f = Math.tan(Math.PI * 0.5 - 0.5 * fovy);
      const rangeInv = 1.0 / (near - far);
      return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (near + far) * rangeInv, -1, 0, 0, near * far * rangeInv * 2, 0];
    },
    translate: (m, tx, ty, tz) => [
      m[0], m[1], m[2], m[3],
      m[4], m[5], m[6], m[7],
      m[8], m[9], m[10], m[11],
      (tx || 0) * m[0] + (ty || 0) * m[4] + (tz || 0) * m[8] + m[12],
      (tx || 0) * m[1] + (ty || 0) * m[5] + (tz || 0) * m[9] + m[13],
      (tx || 0) * m[2] + (ty || 0) * m[6] + (tz || 0) * m[10] + m[14],
      (tx || 0) * m[3] + (ty || 0) * m[7] + (tz || 0) * m[11] + m[15]
    ],
    scale: (m, sx, sy, sz) => [
      (sx || 1) * m[0], (sx || 1) * m[1], (sx || 1) * m[2], (sx || 1) * m[3],
      (sy || 1) * m[4], (sy || 1) * m[5], (sy || 1) * m[6], (sy || 1) * m[7],
      (sz || 1) * m[8], (sz || 1) * m[9], (sz || 1) * m[10], (sz || 1) * m[11],
      m[12], m[13], m[14], m[15]
    ],
    xRotate: (m, rad) => {
      const c = Math.cos(rad), s = Math.sin(rad);
      return [m[0], m[1], m[2], m[3], c * m[4] + s * m[8], c * m[5] + s * m[9], c * m[6] + s * m[10], c * m[7] + s * m[11], c * m[8] - s * m[4], c * m[9] - s * m[5], c * m[10] - s * m[6], c * m[11] - s * m[7], m[12], m[13], m[14], m[15]];
    },
    yRotate: (m, rad) => {
      const c = Math.cos(rad), s = Math.sin(rad);
      return [c * m[0] - s * m[8], c * m[1] - s * m[9], c * m[2] - s * m[10], c * m[3] - s * m[11], m[4], m[5], m[6], m[7], s * m[0] + c * m[8], s * m[1] + c * m[9], s * m[2] + c * m[10], s * m[3] + c * m[11], m[12], m[13], m[14], m[15]];
    },
    zRotate: (m, rad) => {
      const c = Math.cos(rad), s = Math.sin(rad);
      return [c * m[0] + s * m[4], c * m[1] + s * m[5], c * m[2] + s * m[6], c * m[3] + s * m[7], c * m[4] - s * m[0], c * m[5] - s * m[1], c * m[6] - s * m[2], c * m[7] - s * m[3], m[8], m[9], m[10], m[11], m[12], m[13], m[14], m[15]];
    },
    multiply: (a, b) => {
      const out = new Array(16);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          out[i * 4 + j] = a[i * 4 + 0] * b[0 * 4 + j] + a[i * 4 + 1] * b[1 * 4 + j] + a[i * 4 + 2] * b[2 * 4 + j] + a[i * 4 + 3] * b[3 * 4 + j];
        }
      }
      return out;
    },
    lookAt: (eye, target, up) => {
      const [ex, ey, ez] = eye;
      const [tx, ty, tz] = target;
      const [ux, uy, uz] = up;

      // front
      let zx = ex - tx, zy = ey - ty, zz = ez - tz;
      let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
      if (len > 0) { len = 1 / len; zx *= len; zy *= len; zz *= len; }

      // 右向量
      let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
      len = Math.sqrt(xx * xx + xy * xy + xz * xz);
      if (len > 0) { len = 1 / len; xx *= len; xy *= len; xz *= len; }

      // up
      let yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;

      return [
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx * ex + xy * ey + xz * ez),
        -(yx * ex + yy * ey + yz * ez),
        -(zx * ex + zy * ey + zz * ez),
        1
      ];
    },
    v3_add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    v3_sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    v3_mul: (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]],
    v3_normalize: (v) => {
      const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
    },
    v3_transform: (v, m) => [
      v[0] * m[0] + v[1] * m[4] + v[2] * m[8] + m[12],
      v[0] * m[1] + v[1] * m[5] + v[2] * m[9] + m[13],
      v[0] * m[2] + v[1] * m[6] + v[2] * m[10] + m[14]
    ]
  };

  // ==========================================
  // 通用
  // ==========================================

  const fetchBinaryData = async (url) => {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL');

    // DataURL
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const b64 = parts.pop();
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return bytes;
    }

    //  HTTP(S) 或 Blob URL
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (e) {
      console.error('Binary fetch error:', e);
      throw e;
    }
  };

  const _parseInput = (input, util) => {
    if (typeof input === "string" && input.startsWith("[")) {
      try { return JSON.parse(input); } catch (e) { return null; }
    }
    const list = util.target.lookupVariableByNameAndType(input, "list");
    return list ? list.value.map(Number) : null;
  };

  const _getList = (name, util) => {
    if (!name) return null;
    const list = util.target.lookupVariableByNameAndType(name, "list");
    if (!list) return null;
    return list.value.map(Number); // 转换为 TypedArray 之前必须是 Number
  };
  const _getAllLists = () => {
    const stage = vm.runtime.getTargetForStage();
    const editingTarget = vm.editingTarget || stage;
    const lists = ["NONE"];

    // 获取当前选中的角色（Sprite）的私有列表
    if (editingTarget && editingTarget.variables) {
      Object.values(editingTarget.variables)
        .filter(v => v.type === 'list')
        .forEach(v => lists.push(v.name));
    }

    // 获取舞台（Stage）的全局列表
    if (stage && stage !== editingTarget && stage.variables) {
      Object.values(stage.variables)
        .filter(v => v.type === 'list')
        .forEach(v => {
          if (!lists.includes(v.name)) lists.push(v.name);
        });
    }

    return lists;
  }

  const _getFormatConfig = (formatStr) => {
    const gl = gl3d;
    const formatMap = {
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
    return formatMap[formatStr] || formatMap["RGB8"];
  }

  const _parseHDR = (buffer) => {
    const bytes = new Uint8Array(buffer);

    // Header
    let header = "";
    let offset = 0;
    while (offset < bytes.length) {
      let line = "";
      while (offset < bytes.length && bytes[offset] !== 10) { // 查找 \n
        line += String.fromCharCode(bytes[offset++]);
      }
      offset++; // 跳过 \n
      if (line.trim() === "") break; // 空行，元数据部分结束
      header += line + "\n";
    }

    // 分辨率行
    let resLine = "";
    while (offset < bytes.length && bytes[offset] !== 10) {
      resLine += String.fromCharCode(bytes[offset++]);
    }
    offset++; // \n

    const resMatch = resLine.match(/[+-]Y\s+(\d+)\s+[+-]X\s+(\d+)/);
    if (!resMatch) {
      console.error("Failed resolution line:", resLine);
      throw new Error("Invalid HDR header: Resolution line not found or malformed");
    }

    const height = parseInt(resMatch[1]);
    const width = parseInt(resMatch[2]);

    // 3. 解码 RLE
    const floatData = new Float32Array(width * height * 3);
    const scanlineRGBE = new Uint8Array(width * 4);
    let floatOffset = 0;

    for (let y = 0; y < height; y++) {
      if (offset + 4 > bytes.length) break;

      const rgbe = bytes.subarray(offset, offset + 4);
      offset += 4;

      // 检查是否为现代 RLE 格式
      if (rgbe[0] !== 2 || rgbe[1] !== 2 || (rgbe[2] & 0x80)) {
        throw new Error("Only modern RLE HDR is supported. This file uses an older or incompatible format.");
      }

      const lineLen = (rgbe[2] << 8) | rgbe[3];
      if (lineLen !== width) throw new Error("Scanline length mismatch");

      // R, G, B, E
      for (let i = 0; i < 4; i++) {
        let ptr = i * width;
        const endPtr = (i + 1) * width;
        while (ptr < endPtr) {
          const code = bytes[offset++];
          if (code > 128) { // Run: 接下来一个字节重复 (code-128) 次
            const count = code - 128;
            const val = bytes[offset++];
            for (let j = 0; j < count; j++) scanlineRGBE[ptr++] = val;
          } else { // Literal: 接下来读取 code 个字节
            const count = code;
            for (let j = 0; j < count; j++) scanlineRGBE[ptr++] = bytes[offset++];
          }
        }
      }

      // RGBE 转换为浮点数
      for (let x = 0; x < width; x++) {
        const r = scanlineRGBE[x];
        const g = scanlineRGBE[x + width];
        const b = scanlineRGBE[x + 2 * width];
        const e = scanlineRGBE[x + 3 * width];

        if (e > 0) {
          // 这里的 pow(2, e-128) / 256 是 RGBE 转换公式
          const f = Math.pow(2.0, e - (128 + 8));
          floatData[floatOffset++] = r * f;
          floatData[floatOffset++] = g * f;
          floatData[floatOffset++] = b * f;
        } else {
          floatData[floatOffset++] = 0;
          floatData[floatOffset++] = 0;
          floatData[floatOffset++] = 0;
        }
      }
    }

    return { width, height, data: floatData };
  };
  const _parseKTX = (buffer) => {
    const bytes = new Uint8Array(buffer);

    // KTX 1.0 标识符
    const identifier = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 12; i++) {
      if (bytes[i] !== identifier[i]) throw new Error("Vapor3D: Not a valid KTX 1.0 file");
    }

    const dv = new DataView(buffer);
    // 确定字节序 0x04030201 小端
    const littleEndian = dv.getUint32(12, true) === 0x04030201;

    const glType = dv.getUint32(16, littleEndian);
    const glFormat = dv.getUint32(24, littleEndian);
    const glInternalFormat = dv.getUint32(28, littleEndian);

    const pixelWidth = dv.getUint32(36, littleEndian);
    const pixelHeight = dv.getUint32(40, littleEndian);
    const numberOfFaces = dv.getUint32(52, littleEndian);
    let numberOfMipmapLevels = dv.getUint32(56, littleEndian);
    const bytesOfKeyValueData = dv.getUint32(60, littleEndian);

    if (numberOfFaces !== 6) {
      throw new Error("Vapor3D: KTX parsing error. Expected a Cubemap (6 faces), but got " + numberOfFaces);
    }

    // 如果没有开启 Mipmap，KTX 文件中该值为 0，视为 1 层
    if (numberOfMipmapLevels === 0) numberOfMipmapLevels = 1;

    let offset = 64 + bytesOfKeyValueData; // 数据块的起始位置
    const mipmaps = [];

    for (let mip = 0; mip < numberOfMipmapLevels; mip++) {
      const imageSize = dv.getUint32(offset, littleEndian);
      offset += 4;

      for (let face = 0; face < numberOfFaces; face++) {
        // 提取二进制切片
        const faceBuffer = buffer.slice(offset, offset + imageSize);

        // 5126 = gl.FLOAT
        // 5131 = gl.HALF_FLOAT (WebGL2), 36193 = gl.HALF_FLOAT_OES (WebGL1)
        // 5121 = gl.UNSIGNED_BYTE
        let dataArray;
        if (glType === 5126) {
          dataArray = new Float32Array(faceBuffer);
        } else if (glType === 5131 || glType === 36193) {
          dataArray = new Uint16Array(faceBuffer);
        } else {
          dataArray = new Uint8Array(faceBuffer);
        }

        mipmaps.push({
          level: mip,
          face: face,
          width: Math.max(1, pixelWidth >> mip),
          height: Math.max(1, pixelHeight >> mip),
          data: dataArray
        });

        offset += imageSize;

        // KTX 要求每个面数据后都要按 4 字节对齐
        offset = (offset + 3) & ~3;
      }

      // Padding
      offset = (offset + 3) & ~3;
    }

    return { glInternalFormat, glFormat, glType, numberOfMipmapLevels, mipmaps };
  };
  // ==========================================
  // 纹理池
  // ==========================================
  const texturePool = {
    cache: new Map(),

    // 检查是否存在
    has(name) { return this.cache.has(name); },

    // 渲染循环中获取 ID
    getId(name) { return this.cache.get(name)?.id; },

    // 渲染循环中获取 WebGL 对象
    get(name) { return this.cache.get(name)?.texture; },

    // 添加纹理
    set(name, id, texture) { this.cache.set(name, { id, texture }); },

    destroy(name) {
      const item = this.cache.get(name);
      if (item) {
        gl3d.deleteTexture(item.texture);
        this.cache.delete(name);
      }
    },

    clearAll() {
      this.cache.forEach((item) => {
        gl3d.deleteTexture(item.texture);
      });
      this.cache.clear();
    }
  };

  // ==========================================
  // Vapor3D
  // ==========================================
  class Vapor3D {
    getInfo() {
      return {
        id: "vapor3D",
        name: "Vapor3D",
        color1: "#2f2f36",
        blocks: [
          { opcode: "gl_Init", blockType: "command", text: "init WebGL" },
          { opcode: "gl_ResetResources", blockType: "command", text: "reset all" },
          { opcode: "gl_Clear", blockType: "command", text: "glClear [BIT]", arguments: { BIT: { type: "string", menu: "clearMenu" } } },
          {
            opcode: "gl_SetClearColor",
            blockType: "command",
            text: "glClearColor R [R] G [G] B [B] A [A]",
            arguments: {
              R: { type: "number", defaultValue: 0 },
              G: { type: "number", defaultValue: 0 },
              B: { type: "number", defaultValue: 0 },
              A: { type: "number", defaultValue: 0 }
            }
          },

          "---",
          { blockType: "label", text: "Shader" },

          { opcode: "shader_Create", blockType: "command", text: "create shader [ID] VS [VS] FS [FS]", arguments: { ID: { type: "string" }, VS: { type: "string" }, FS: { type: "string" } } },
          { opcode: "shader_Use", blockType: "command", text: "shader.use([ID])", arguments: { ID: { type: "string" } } },
          { opcode: "shader_SetMat4", blockType: "command", text: "shader [ID] setMat4 [NAME] [VAL]", arguments: { ID: { type: "string" }, NAME: { type: "string" }, VAL: { type: "string" } } },
          {
            opcode: "shader_SetVec2",
            blockType: "command",
            text: "shader [ID] setVec2 [NAME] X [X] Y [Y]",
            arguments: {
              ID: { type: "string" },
              NAME: { type: "string" },
              X: { type: "number", defaultValue: 0 },
              Y: { type: "number", defaultValue: 0 }
            }
          },
          { opcode: "shader_SetVec3", blockType: "command", text: "shader [ID] setVec3 [NAME] X [X] Y [Y] Z [Z]", arguments: { ID: { type: "string" }, NAME: { type: "string" }, X: { type: "number" }, Y: { type: "number" }, Z: { type: "number" } } },
          {
            opcode: "shader_SetFloat",
            blockType: "command",
            text: "shader [ID] setFloat [NAME] to [V]",
            arguments: {
              ID: { type: "string" },
              NAME: { type: "string" },
              V: { type: "number", defaultValue: 0 }
            }
          },
          { opcode: "shader_SetInt", blockType: "command", text: "shader [ID] setInt [NAME] [V]", arguments: { ID: { type: "string" }, NAME: { type: "string" }, V: { type: "number" } } },

          "---",
          { blockType: "label", text: "Framebuffer" },

          { opcode: "fbo_Create", blockType: "command", text: "create FBO [ID]", arguments: { ID: { type: "string", defaultValue: "fbo1" } } },
          {
            opcode: "fbo_AttachTexture",
            blockType: "command",
            text: "FBO [ID] attach texture [TEX] to [SLOT]",
            arguments: {
              ID: { type: "string", defaultValue: "fbo1" },
              TEX: { type: "string", defaultValue: "renderTarget1" },
              SLOT: { type: "string", menu: "fboSlotMenu", defaultValue: "COLOR_ATTACHMENT0" }
            }
          },
          { opcode: "fbo_Bind", blockType: "command", text: "glBindFramebuffer [ID]", arguments: { ID: { type: "string" } } },

          "---",
          { blockType: "label", text: "Vertex Array Object" },

          { opcode: "vao_CreateScreenQuad", blockType: "command", text: "Init RenderQuad [ID]", arguments: { ID: { type: "string", defaultValue: "screenQuad" } } },
          { opcode: "vao_CreateCube", blockType: "command", text: "Init Cube [ID]", arguments: { ID: { type: "string", defaultValue: "cube" } } },
          { opcode: "vao_CreateSphere", blockType: "command", text: "Init RenderSphere [ID] Lat [LAT] Lon [LON]", arguments: {ID: { type: "string", defaultValue: "lightSphere" },LAT: { type: "number", defaultValue: 16 },LON: { type: "number", defaultValue: 16 }}},
          {
            opcode: "vao_CreateCustom",
            blockType: "command",
            text: "create VAO [ID] #0 [L0] size [S0] #1 [L1] size [S1] #2 [L2] size [S2] #3 [L3] size [S3] Indices [I]",
            arguments: {
              ID: { type: "string", defaultValue: "sample" },
              L0: { type: "string", menu: "listMenu", defaultValue: "NONE" }, S0: { type: "string", menu: "compSizeMenu", defaultValue: "3" },
              L1: { type: "string", menu: "listMenu", defaultValue: "NONE" }, S1: { type: "string", menu: "compSizeMenu", defaultValue: "2" },
              L2: { type: "string", menu: "listMenu", defaultValue: "NONE" }, S2: { type: "string", menu: "compSizeMenu", defaultValue: "3" },
              L3: { type: "string", menu: "listMenu", defaultValue: "NONE" }, S3: { type: "string", menu: "compSizeMenu", defaultValue: "3" },
              I: { type: "string", menu: "listMenu", defaultValue: "NONE" }
            }
          },

          "---",
          { blockType: "label", text: "Texture" },

          {
            opcode: "tex_CreateEmpty",
            blockType: "command",
            text: "create empty texture [NAME] size [W]x[H] format [FORMAT]",
            arguments: {
              NAME: { type: "string", defaultValue: "renderTarget1" },
              W: { type: "number", defaultValue: 480 },
              H: { type: "number", defaultValue: 360 },
              FORMAT: { type: "string", menu: "texTypeMenu", defaultValue: "RGB8" }
            }
          },
          {
            opcode: "tex_LoadFromCostume",
            blockType: "command",
            text: "load texture [NAME] from costume [C]",
            arguments: {
              C: { type: "string", menu: "costumeMenu" },
              NAME: { type: "string", defaultValue: "tex1" }
            }
          },
          {
            opcode: "tex_LoadFromURL",
            blockType: "command",
            text: "load texture [NAME] from URL [U]",
            arguments: {
              U: { type: "string", defaultValue: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg" },
              NAME: { type: "string", defaultValue: "texURL1" }
            }
          },
          {
            opcode: "tex_LoadFromBuffer",
            blockType: "command",
            text: "load texture [NAME] from registry ID [ID]",
            arguments: {
              NAME: { type: "string", defaultValue: "tex1" },
              ID: { type: "string", defaultValue: "" }
            }
          },
          {
            opcode: "tex_LoadKTXFromURL",
            blockType: "command",
            text: "load KTX cubemap [NAME] from URL [U]",
            arguments: {
              NAME: { type: "string", defaultValue: "prefilterMap" },
              U: { type: "string" }
            }
          },
          {
            opcode: "tex_Destroy",
            blockType: "command",
            text: "destroy texture [NAME]",
            arguments: {
              NAME: { type: "string", menu: "costumeMenu" }
            }
          },
          "---",
          {
            opcode: "gl_BindTexture",
            blockType: "command",
            text: "glActiveTexture [UNIT] bind [TEX]",
            arguments: {
              TEX: { type: "string" },
              UNIT: { type: "number", defaultValue: 0 }
            }
          },
          {
            opcode: "gl_BindCubemap",
            blockType: "command",
            text: "glActiveTexture [UNIT] bind Cubemap [TEX]",
            arguments: {
              TEX: { type: "string", defaultValue: "prefilterMap" },
              UNIT: { type: "number", defaultValue: 0 }
            }
          },
          "---",
          {
            opcode: "tex_GenerateMipmap",
            blockType: "command",
            text: "glGenerateMipmap [TEX]",
            arguments: {
              TEX: { type: "string", menu: "costumeMenu" }
            }
          },
          {
            opcode: "tex_SetFilter",
            blockType: "command",
            text: "set texture [TEX] filter mode [MODE]",
            arguments: {
              TEX: { type: "string", menu: "costumeMenu" },
              MODE: { type: "string", menu: "filterMode" }
            }
          },
          {
            opcode: "tex_SetWrap",
            blockType: "command",
            text: "set texture [TEX] wrap mode [AXIS] [MODE]",
            arguments: {
              TEX: { type: "string", menu: "costumeMenu" },
              AXIS: { type: "string", menu: "wrapAxis" },
              MODE: { type: "string", menu: "wrapMode" }
            }
          },

          "---",
          { blockType: "label", text: "Render" },
          { opcode: "gl_Draw", blockType: "command", text: "glDraw [ID] count [COUNT] mode [MODE]", arguments: { ID: { type: "string", defaultValue: "sample" }, COUNT: { type: "number" }, MODE: { type: "string", menu: "drawMode" } } },
          { opcode: "gl_Present", blockType: "command", text: "update layer" },

          "---",
          { blockType: "label", text: "GL States" },
          { opcode: "st_Enable", blockType: "command", text: "glEnable [CAP]", arguments: { CAP: { type: "string", menu: "capMenu" } } },
          { opcode: "st_Disable", blockType: "command", text: "glDisable [CAP]", arguments: { CAP: { type: "string", menu: "capMenu" } } },

          "---",
          { opcode: "st_CullFace", blockType: "command", text: "glCullFace [MODE]", arguments: { MODE: { type: "string", menu: "faceMenu", defaultValue: "BACK" } } },
          "---",
          { opcode: "st_ColorMask", blockType: "command", text: "glColorMask [STATE]", arguments: { STATE: { type: "string", menu: "boolMenu", } } },

          "---",
          { opcode: "st_DepthMask", blockType: "command", text: "glDepthMask [STATE]", arguments: { STATE: { type: "string", menu: "boolMenu", defaultValue: "true" } } },
          { opcode: "st_DepthFunc", blockType: "command", text: "glDepthFunc [FUNC]", arguments: { FUNC: { type: "string", menu: "funcMenu", defaultValue: "LESS" } } },

          "---",
          {
            opcode: "st_StencilMask",
            blockType: "command",
            text: "glStencilMask [MASK]",
            arguments: {
              MASK: { type: "number", defaultValue: 255 } // 255 => 0xFF
            }
          },
          {
            opcode: "st_StencilOp",
            blockType: "command",
            text: "glStencilOp [FACE] fail [SF] zfail [DF] zpass [DP]",
            arguments: {
              FACE: { type: "string", menu: "faceMenu", defaultValue: "FRONT_AND_BACK" },
              SF: { type: "string", menu: "opMenu", defaultValue: "KEEP" }, // 模板测试失败
              DF: { type: "string", menu: "opMenu", defaultValue: "KEEP" }, // 深度测试失败
              DP: { type: "string", menu: "opMenu", defaultValue: "KEEP" }  // 深度测试通过
            }
          },
          {
            opcode: "st_StencilFunc",
            blockType: "command",
            text: "glStencilFunc [FUNC] ref [REF] mask [MASK]",
            arguments: {
              FUNC: { type: "string", menu: "funcMenu", defaultValue: "ALWAYS" },
              REF: { type: "number", defaultValue: 0 },
              MASK: { type: "number", defaultValue: 255 }
            }
          },
          
          "---",
          { blockType: "label", text: "Math" },
          {
            opcode: "v3_Init", blockType: "command", text: "vec3 [ID] = X [X] Y [Y] Z [Z]",
            arguments: { ID: { type: "string", defaultValue: "v1" }, X: { type: "number" }, Y: { type: "number" }, Z: { type: "number" } }
          },
          {
            opcode: "v3_Modify", blockType: "command", text: "vec3 [ID] [OP] [OTHER]",
            arguments: { ID: { type: "string", defaultValue: "v1" }, OP: { type: "string", menu: "v3OpMenu" }, OTHER: { type: "string", defaultValue: "v2" } }
          },
          {
            opcode: "v3_ApplyMatrix", blockType: "command", text: "vec3 [ID] apply mat4 [M]",
            arguments: { ID: { type: "string", defaultValue: "v1" }, M: { type: "string" } }
          },
          {
            opcode: "v3_Get", blockType: "reporter", text: "vec3 [ID] 's [COMP]",
            arguments: { ID: { type: "string", defaultValue: "v1" }, COMP: { type: "string", menu: "v3CompMenu" } }
          },
          { opcode: "m4_Identity", blockType: "reporter", text: "glm::mat4" },
          { opcode: "m4_Perspective", blockType: "reporter", text: "glm::perspective [F] [A] [N] [F2]", arguments: { F: { type: "number", defaultValue: 45 }, A: { type: "number", defaultValue: 1.33 }, N: { type: "number", defaultValue: 0.1 }, F2: { type: "number", defaultValue: 100 } } },
          {
            opcode: "m4_LookAt", blockType: "reporter", text: "glm::lookAt Eye[EX],[EY],[EZ] Target[TX],[TY],[TZ] Up[UX],[UY],[UZ]", arguments: {
              EX: { type: "number", defaultValue: 0 }, EY: { type: "number", defaultValue: 0 }, EZ: { type: "number", defaultValue: 5 },
              TX: { type: "number", defaultValue: 0 }, TY: { type: "number", defaultValue: 0 }, TZ: { type: "number", defaultValue: 0 },
              UX: { type: "number", defaultValue: 0 }, UY: { type: "number", defaultValue: 1 }, UZ: { type: "number", defaultValue: 0 }
            }
          },
          { opcode: "m4_Translate", blockType: "reporter", text: "glm::translate [M] [X] [Y] [Z]", arguments: { M: { type: "string" }, X: { type: "number" }, Y: { type: "number" }, Z: { type: "number" } } },
          { opcode: "m4_Rotate", blockType: "reporter", text: "glm::rotate [M] [AXIS] [DEG]", arguments: { M: { type: "string" }, AXIS: { type: "string", menu: "axisMenu" }, DEG: { type: "number" } } },
          { opcode: "m4_Translate", blockType: "reporter", text: "glm::translate [M] [X] [Y] [Z]", arguments: { M: { type: "string" }, X: { type: "number" }, Y: { type: "number" }, Z: { type: "number" } } },
          { opcode: "m4_Scale", blockType: "reporter", text: "glm::scale [M] X[X] Y[Y] Z[Z]", arguments: { M: { type: "string" }, X: { type: "number", defaultValue: 1 }, Y: { type: "number", defaultValue: 1 }, Z: { type: "number", defaultValue: 1 } } },
          { opcode: "m4_Multiply", blockType: "reporter", text: "glm:: [A] * [B]", arguments: { A: { type: "string" }, B: { type: "string" } } },
        ],
        menus: {
          clearMenu: ["COLOR_BUFFER_BIT", "DEPTH_BUFFER_BIT", "STENCIL_BUFFER_BIT", "ALL"],
          drawMode: ["TRIANGLES", "TRIANGLE_STRIP", "LINES", "POINTS"],
          capMenu: ["DEPTH_TEST", "STENCIL_TEST", "BLEND", "CULL_FACE"],
          axisMenu: ["X", "Y", "Z"],
          v3OpMenu: ["+", "-", "mul"],
          v3CompMenu: ["X", "Y", "Z"],
          costumeMenu: { acceptReporters: true, items: "tex_getCostumes"},
          listMenu: { acceptReporters: true, items: "getAllLists" },
          compSizeMenu: ["1", "2", "3", "4"],
          texTypeMenu: [
            "RGB16F", "RGBA16F", "RGB32F",
            "RGB8", "RGBA8",
            "R11G11B10F", "R16F", "RG16F",
            "DEPTH24_STENCIL8", "DEPTH_COMPONENT24"
          ],          fboSlotMenu: ["COLOR_ATTACHMENT0", "COLOR_ATTACHMENT1", "COLOR_ATTACHMENT2", "COLOR_ATTACHMENT3", "DEPTH_STENCIL_ATTACHMENT", "DEPTH_ATTACHMENT"],
          depthMenu: ["RBO", "TEXTURE","NONE"],
          filterMode: ["NEAREST","LINEAR","NEAREST_MIPMAP_NEAREST","LINEAR_MIPMAP_NEAREST","NEAREST_MIPMAP_LINEAR","LINEAR_MIPMAP_LINEAR"],
          wrapAxis: ["S","T"],
          wrapMode: ["REPEAT","CLAMP_TO_EDGE","MIRRORED_REPEAT"],
          boolMenu: ["true", "false"],
          funcMenu: ["NEVER", "LESS", "EQUAL", "LEQUAL", "GREATER", "NOTEQUAL", "GEQUAL", "ALWAYS"],
          opMenu: { acceptReporters: true, items: [ { text: "KEEP", value: "KEEP" }, { text: "ZERO", value: "ZERO" }, { text: "REPLACE", value: "REPLACE" }, { text: "INCR", value: "INCR" }, { text: "DECR", value: "DECR" }, { text: "INVERT", value: "INVERT" }, { text: "INCR_WRAP", value: "INCR_WRAP" }, { text: "DECR_WRAP", value: "DECR_WRAP" } ] },
          faceMenu: { acceptReporters: true, items: [ { text: "FRONT", value: "FRONT" }, { text: "BACK", value: "BACK" }, { text: "FRONT_AND_BACK", value: "FRONT_AND_BACK" } ] },
        }
      };
    }

    getAllLists() {
      return _getAllLists();
    }

    gl_Init() {
      initCanvasOverlay();
      canvas3d.style.display = 'block'; // 显示

      // 同步一次物理分辨率
      const mainCanvas = renderer.canvas;
      canvas3d.width = mainCanvas.width;
      canvas3d.height = mainCanvas.height;
      gl3d.viewport(0, 0, canvas3d.width, canvas3d.height);

      gl3d.enable(gl3d.DEPTH_TEST);
      gl3d.enable(gl3d.STENCIL_TEST);

      gl3d.getExtension('OES_texture_float_linear');
      gl3d.getExtension('OES_texture_half_float_linear');
      const ext = gl3d.getExtension('EXT_color_buffer_float');

      // 劫持原有画布，禁用渲染
      if (!originalDraw) {
        originalDraw = renderer.draw.bind(renderer);
        renderer.draw = () => {
          if (isTakenOver) return;
          originalDraw();
        };
      }
      isTakenOver = true;

      // 测试
      // gl3d.clearColor(1, 0, 0, 1); gl3d.clear(gl3d.COLOR_BUFFER_BIT);
    }


    gl_ResetResources() {
      if (!gl3d) return;

      shaders.forEach(p => gl3d.deleteProgram(p));
      shaders.clear();

      fbos.forEach(entry => {
        if (entry && entry.fbo) gl3d.deleteFramebuffer(entry.fbo);
      });
      fbos.clear();

      vaos.forEach(v => gl3d.deleteVertexArray(v.vao));
      vaos.clear();

      vbos.forEach(b => gl3d.deleteBuffer(b));
      vbos.length = 0;
      rbos.forEach(r => gl3d.deleteRenderbuffer(r));
      rbos.length = 0;

      texturePool.clearAll();
      textures.forEach(t => {
        if (t instanceof WebGLTexture) gl3d.deleteTexture(t);
      });
      textures.clear();

      vectors.clear();

      console.log("Vapor3D: All resources have been released");
    }

    gl_Clear({ BIT }) {
      let m = (BIT === "ALL") ? (gl3d.COLOR_BUFFER_BIT | gl3d.DEPTH_BUFFER_BIT | gl3d.STENCIL_BUFFER_BIT) : gl3d[BIT];
      gl3d.clear(m);
    }

    gl_SetClearColor({ R, G, B, A }) { gl3d.clearColor(R, G, B, A); }

    shader_Create({ ID, VS, FS }) {
      const fixGLSL = (src) => {
        if (!src) return "";
        let s = src.trim();

        s = s.replace(/\/\*[\s\S]*?\*\//g, '');
        s = s.replace(/\/\/.*/g, (match) => match + "\n");

        if (s.includes('#version')) {
          s = s.replace(/(#version\s+300\s+es)\s*/, "$1\n");
        }
        // 补换行
        const lineCount = (s.match(/\n/g) || []).length;
        if (lineCount < 3) {
          s = s.replace(/;/g, ";\n")
            .replace(/{/g, "{\n")
            .replace(/}/g, "}\n");
        }

        // 清理每一行的首尾空格，移除多余空行
        return s.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
      };

      const vSrc = fixGLSL(VS);
      const fSrc = fixGLSL(FS);

      // 检查 ID 是否存在且源码是否有效
      if (vSrc.length < 10 || shaders.has(ID)) return;

      const c = (s, t) => {
        const o = gl3d.createShader(t);
        gl3d.shaderSource(o, s);
        gl3d.compileShader(o);
        if (!gl3d.getShaderParameter(o, gl3d.COMPILE_STATUS)) {
          const type = t === gl3d.VERTEX_SHADER ? "Vertex" : "Fragment";
          console.error(`Vapor3D ${type} Shader Error (${ID}):`, gl3d.getShaderInfoLog(o));
          console.log("%c Processed GLSL Source: ", "\n" + s);
          return null;
        }
        return o;
      };

      const v = c(vSrc, gl3d.VERTEX_SHADER);
      const f = c(fSrc, gl3d.FRAGMENT_SHADER);
      if (!v || !f) return;

      const p = gl3d.createProgram();
      gl3d.attachShader(p, v);
      gl3d.attachShader(p, f);
      gl3d.linkProgram(p);

      if (!gl3d.getProgramParameter(p, gl3d.LINK_STATUS)) {
        console.error("Link Error:", gl3d.getProgramInfoLog(p));
        return;
      }
      shaders.set(ID, p);
    }

    shader_Use({ ID }) { gl3d.useProgram(shaders.get(ID) || null); }

    shader_SetMat4({ ID, NAME, VAL }, util) {
      const p = shaders.get(ID); const m = _parseInput(VAL, util);
      if (p && m) gl3d.uniformMatrix4fv(gl3d.getUniformLocation(p, NAME), false, new Float32Array(m));
    }

    shader_SetVec3({ ID, NAME, X, Y, Z }) {
      const p = shaders.get(ID); if (p) gl3d.uniform3f(gl3d.getUniformLocation(p, NAME), X, Y, Z);
    }

    shader_SetVec2({ ID, NAME, X, Y }) {
      const p = shaders.get(ID);
      if (p) {
        gl3d.useProgram(p);
        const loc = gl3d.getUniformLocation(p, NAME);
        gl3d.uniform2f(loc, X, Y);
      }
    }

    shader_SetFloat({ ID, NAME, V }) {
      const p = shaders.get(ID);
      if (p) {
        gl3d.useProgram(p);
        const loc = gl3d.getUniformLocation(p, NAME);
        gl3d.uniform1f(loc, V);
      }
    }

    shader_SetInt({ ID, NAME, V }) {
      const p = shaders.get(ID); if (p) gl3d.uniform1i(gl3d.getUniformLocation(p, NAME), V);
    }

    fbo_Create({ ID }) {
      if (fbos.has(ID)) return;
      const fbo = gl3d.createFramebuffer();
      fbos.set(ID, { fbo, width: 0, height: 0, activeSlots: [] });
    }
    fbo_AttachTexture({ ID, TEX, SLOT }) {
      const fboEntry = fbos.get(ID);
      const tex = textures.get(TEX);
      const texInfo = textures.get(TEX + "_info");

      if (!fboEntry || !tex) return;

      gl3d.bindFramebuffer(gl3d.FRAMEBUFFER, fboEntry.fbo);

      const attachmentPoint = gl3d[SLOT];

      gl3d.framebufferTexture2D(gl3d.FRAMEBUFFER, attachmentPoint, gl3d.TEXTURE_2D, tex, 0);

      if (SLOT.startsWith("COLOR_ATTACHMENT")) {
        if (!fboEntry.activeSlots.includes(attachmentPoint)) {
          fboEntry.activeSlots.push(attachmentPoint);
          fboEntry.activeSlots.sort();
          gl3d.drawBuffers(fboEntry.activeSlots);
        }
      }

      if (texInfo && fboEntry.width === 0) {
        fboEntry.width = texInfo.w;
        fboEntry.height = texInfo.h;
      }

      gl3d.bindFramebuffer(gl3d.FRAMEBUFFER, null);
    }

    fbo_Bind({ ID }) {
      const entry = fbos.get(ID);
      if (entry) {
        // 渲染到 FBO：viewport 为 FBO 大小
        gl3d.bindFramebuffer(gl3d.FRAMEBUFFER, entry.fbo);
        gl3d.viewport(0, 0, entry.width, entry.height);
      } else {
        // 渲染到屏幕：视口设为 canvas3d 的物理大小
        gl3d.bindFramebuffer(gl3d.FRAMEBUFFER, null);
        gl3d.viewport(0, 0, canvas3d.width, canvas3d.height);
      }
    }

    vao_CreateScreenQuad({ ID }) {
      if (vaos.has(ID)) return;
      const pos = [-1, 1, 0, -1, -1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0];
      const uv = [0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0];
      const vao = gl3d.createVertexArray(); gl3d.bindVertexArray(vao);
      const b = (d, l, s) => {
        const buf = gl3d.createBuffer(); gl3d.bindBuffer(gl3d.ARRAY_BUFFER, buf);
        gl3d.bufferData(gl3d.ARRAY_BUFFER, new Float32Array(d), gl3d.STATIC_DRAW);
        gl3d.enableVertexAttribArray(l); gl3d.vertexAttribPointer(l, s, gl3d.FLOAT, false, 0, 0);
        vbos.push(buf);
      };
      b(pos, 0, 3); b(uv, 1, 2);
      vaos.set(ID, { vao, hasElements: false }); gl3d.bindVertexArray(null);
      vaos.set(ID, { vao, hasElements: false, defaultCount: 6 });
    }
    vao_CreateCube({ ID }) {
      if (vaos.has(ID)) return;
      const vertices = [
        -1, -1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, -1, 1, -1, -1, -1, -1,
        -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1,
        1, 1, 1, 1, 1, -1, 1, -1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1,
        -1, -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, 1, -1, -1, -1,
        -1, 1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, -1, 1, 1, -1, 1, -1
      ];
      const vao = gl3d.createVertexArray();
      gl3d.bindVertexArray(vao);
      const buf = gl3d.createBuffer();
      gl3d.bindBuffer(gl3d.ARRAY_BUFFER, buf);
      gl3d.bufferData(gl3d.ARRAY_BUFFER, new Float32Array(vertices), gl3d.STATIC_DRAW);
      gl3d.enableVertexAttribArray(0);
      gl3d.vertexAttribPointer(0, 3, gl3d.FLOAT, false, 0, 0);
      vbos.push(buf);
      vaos.set(ID, { vao, hasElements: false, defaultCount: 36 });
      gl3d.bindVertexArray(null);
    }
    vao_CreateSphere(args) {
      const ID = String(args.ID);
      if (vaos.has(ID)) return;
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
          const x = Math.cos(phi) * sinTheta;
          const y = cosTheta;
          const z = Math.sin(phi) * sinTheta;
          pos.push(x, y, z);
        }
      }
      for (let i = 0; i < latBands; i++) {
        for (let j = 0; j < lonBands; j++) {
          const first = i * (lonBands + 1) + j;
          const second = first + lonBands + 1;

          // 左上 -> 右上 -> 左下
          indices.push(first, first + 1, second);
          // 左下 -> 右上 -> 右下
          indices.push(second, first + 1, second + 1);
        }
      }
      const vao = gl3d.createVertexArray();
      gl3d.bindVertexArray(vao);
      const b = (d, l, s) => {
        const buf = gl3d.createBuffer();
        gl3d.bindBuffer(gl3d.ARRAY_BUFFER, buf);
        gl3d.bufferData(gl3d.ARRAY_BUFFER, new Float32Array(d), gl3d.STATIC_DRAW);
        gl3d.enableVertexAttribArray(l);
        gl3d.vertexAttribPointer(l, s, gl3d.FLOAT, false, 0, 0);
        vbos.push(buf);
      };
      b(pos, 0, 3);
      const ebo = gl3d.createBuffer();
      gl3d.bindBuffer(gl3d.ELEMENT_ARRAY_BUFFER, ebo);
      gl3d.bufferData(gl3d.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl3d.STATIC_DRAW);
      vbos.push(ebo);
      gl3d.bindVertexArray(null);
      vaos.set(ID, {
        vao,
        hasElements: true,
        defaultCount: indices.length,
        elementType: gl3d.UNSIGNED_SHORT
      });
    }
    vao_CreateCustom({ ID, L0, S0, L1, S1, L2, S2, L3, S3, I }, util) {
      if (vaos.has(ID)) return;

      const vao = gl3d.createVertexArray();
      gl3d.bindVertexArray(vao);

      // 将参数组织成数组，方便循环处理
      const slots = [
        { list: L0, size: parseInt(S0), loc: 0 },
        { list: L1, size: parseInt(S1), loc: 1 },
        { list: L2, size: parseInt(S2), loc: 2 },
        { list: L3, size: parseInt(S3), loc: 3 }
      ];

      let drawCount = 0;

      slots.forEach(slot => {
        if (slot.list === "NONE") return;

        const data = _getList(slot.list, util);
        if (!data || data.length === 0) return;

        // 用第一个有效属性的长度来计算顶点总数
        if (drawCount === 0) drawCount = data.length / slot.size;

        const buf = gl3d.createBuffer();
        gl3d.bindBuffer(gl3d.ARRAY_BUFFER, buf);
        gl3d.bufferData(gl3d.ARRAY_BUFFER, new Float32Array(data), gl3d.STATIC_DRAW);

        gl3d.enableVertexAttribArray(slot.loc);
        gl3d.vertexAttribPointer(slot.loc, slot.size, gl3d.FLOAT, false, 0, 0);
        vbos.push(buf);
      });

      // 索引
      let hasElements = false;
      if (I !== "NONE") {
        const idxData = _getList(I, util);
        if (idxData && idxData.length > 0) {
          const eb = gl3d.createBuffer();
          gl3d.bindBuffer(gl3d.ELEMENT_ARRAY_BUFFER, eb);
          gl3d.bufferData(gl3d.ELEMENT_ARRAY_BUFFER, new Uint32Array(idxData), gl3d.STATIC_DRAW);
          vbos.push(eb);
          hasElements = true;
          drawCount = idxData.length;
        }
      }

      vaos.set(ID, { vao, hasElements, defaultCount: drawCount });
      gl3d.bindVertexArray(null);
    }

    gl_Draw({ ID, COUNT, MODE }) {
      const entry = vaos.get(ID);
      if (!entry) return;
      gl3d.bindVertexArray(entry.vao);
      let drawCount = COUNT;
      if (drawCount === "" || drawCount === null || drawCount === -1 || drawCount === undefined) {
        drawCount = entry.defaultCount;
      }
      if (entry.hasElements) {
        gl3d.drawElements(
          gl3d[MODE] || gl3d.TRIANGLES,
          drawCount,
          entry.elementType || gl3d.UNSIGNED_SHORT,
          0
        );
      } else {
        gl3d.drawArrays(gl3d[MODE] || gl3d.TRIANGLES, 0, drawCount);
      }
      gl3d.bindVertexArray(null);
    }

    gl_Present() {
      if (!gl3d) return;

      const mainCanvas = renderer.canvas;
      if (canvas3d.width !== mainCanvas.width || canvas3d.height !== mainCanvas.height) {
        canvas3d.width = mainCanvas.width;
        canvas3d.height = mainCanvas.height;
        gl3d.viewport(0, 0, canvas3d.width, canvas3d.height);
      }

      runtime.requestRedraw();

      // 通过 Promise 对齐显示器刷新率 (V-Sync)
      // 让 TurboWarp 在执行完这个积木后暂停，等浏览器画完这一帧
      return new Promise(resolve => {
        requestAnimationFrame(resolve);
      });
    }

    st_Enable({ CAP }) { gl3d.enable(gl3d[CAP]); }
    st_Disable({ CAP }) { gl3d.disable(gl3d[CAP]); }
    st_CullFace({ MODE }) {
      if (!gl3d) return;
      const mode = gl3d[MODE];
      if (mode !== undefined) {
        gl3d.cullFace(mode);
      }
    }
    st_StencilOp(args) {
      if (!gl3d) return;
      const face = gl3d[args.FACE] || gl3d.FRONT_AND_BACK;
      // 使用三元运算符或 nullish 合并， 防止跳过 0
      const sfail = gl3d[args.SF] !== undefined ? gl3d[args.SF] : gl3d.KEEP;
      const zfail = gl3d[args.DF] !== undefined ? gl3d[args.DF] : gl3d.KEEP;
      const zpass = gl3d[args.DP] !== undefined ? gl3d[args.DP] : gl3d.KEEP;

      gl3d.stencilOpSeparate(face, sfail, zfail, zpass);
    }

    st_StencilFunc(args) {
      if (!gl3d) return;
      const face = gl3d[args.FACE] || gl3d.FRONT_AND_BACK;
      const func = gl3d[args.FUNC] || gl3d.ALWAYS;
      const ref = (args.REF !== "" && !isNaN(args.REF)) ? parseInt(args.REF) : 0;
      const mask = (args.MASK !== "" && !isNaN(args.MASK)) ? parseInt(args.MASK) : 0xFF;
      gl3d.stencilFuncSeparate(face, func, ref, mask);
    }
    st_StencilMask({ MASK }) {
      if (!gl3d) return;
      const m = (MASK !== "" && !isNaN(MASK)) ? parseInt(MASK) : 0xFF;
      gl3d.stencilMask(m);
    }
    st_ColorMask(args) {
      const state = String(args.STATE) === "true";
      gl3d.colorMask(state, state, state, state);
    }
    st_DepthMask({ STATE }) {
      if (!gl3d) return;
      gl3d.depthMask(STATE === "true");
    }
    st_DepthFunc({ FUNC }) {
      if (!gl3d) return;
      gl3d.depthFunc(gl3d[FUNC]);
    }

    gl_BindTexture({ TEX, UNIT }) {
      gl3d.activeTexture(gl3d.TEXTURE0 + UNIT);

      const texObject = textures.get(TEX);

      if (texObject instanceof WebGLTexture) {
        gl3d.bindTexture(gl3d.TEXTURE_2D, texObject);
      } else {
        gl3d.bindTexture(gl3d.TEXTURE_2D, null);
      }
    }
    gl_BindCubemap({ TEX, UNIT }) {
      const slot = (parseInt(UNIT) || 0);
      gl3d.activeTexture(gl3d.TEXTURE0 + slot);

      const texObject = textures.get(TEX);

      if (texObject instanceof WebGLTexture) {
        gl3d.bindTexture(gl3d.TEXTURE_CUBE_MAP, texObject);
      } else {
        gl3d.bindTexture(gl3d.TEXTURE_CUBE_MAP, null);

        if (texObject === "loading") {
          // console.log(`Vapor3D: still loading`);
        }
      }
    }
    tex_SetFilter({ TEX, MODE }) {
      const texObject = textures.get(TEX);
      if (!texObject) return;

      const modeMap = {
        "LINEAR": gl3d.LINEAR,
        "NEAREST": gl3d.NEAREST,
        "LINEAR_MIPMAP_LINEAR": gl3d.LINEAR_MIPMAP_LINEAR,
      };

      gl3d.bindTexture(gl3d.TEXTURE_2D, texObject);
      gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MIN_FILTER, modeMap[MODE]);
      gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MAG_FILTER, modeMap[MODE]);
    }
    tex_SetWrap({ TEX, AXIS, MODE }) {
      const texObject = textures.get(TEX);
      if (!texObject) return;

      const axisMap = { "S": gl3d.TEXTURE_WRAP_S, "T": gl3d.TEXTURE_WRAP_T };
      const modeMap = { "REPEAT": gl3d.REPEAT, "CLAMP": gl3d.CLAMP_TO_EDGE };

      gl3d.bindTexture(gl3d.TEXTURE_2D, texObject);
      gl3d.texParameteri(gl3d.TEXTURE_2D, axisMap[AXIS], modeMap[MODE]);
    }
    tex_GenerateMipmap({ TEX }) {
      const texObject = textures.get(TEX);
      if (!texObject) {
        console.warn(`Vapor3D: Cannot generate mipmap, texture "${TEX}" not found.`);
        return;
      }
      gl3d.bindTexture(gl3d.TEXTURE_2D, texObject);
      gl3d.generateMipmap(gl3d.TEXTURE_2D);
    }
    tex_getCostumes() {
      return (vm.editingTarget ? vm.editingTarget.getCostumes() : []).map(c => c.name);
    }
    tex_CreateEmpty({ NAME, W, H, FORMAT }) {
      if (textures.has(NAME)) return;
      const conf = _getFormatConfig(FORMAT);

      const tex = gl3d.createTexture();
      gl3d.bindTexture(gl3d.TEXTURE_2D, tex);
      gl3d.texImage2D(gl3d.TEXTURE_2D, 0, conf.internal, W, H, 0, conf.format, conf.type, null);

      gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MIN_FILTER, gl3d.LINEAR);
      gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MAG_FILTER, gl3d.LINEAR);
      gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_S, gl3d.CLAMP_TO_EDGE);
      gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_T, gl3d.CLAMP_TO_EDGE);

      textures.set(NAME, tex);
      textures.set(NAME + "_info", { w: W, h: H });
    }
    async tex_LoadFromCostume({ C, NAME }, { target }) {

      if (textures.has(NAME)) return;

      const cost = target.sprite.costumes.find(c => c.name === C);
      if (!cost) {
        console.error(`Vapor3D: Costume [${C}] not found in sprite.`);
        return;
      }

      textures.set(NAME, "loading");

      try {
        // Uint8Array
        const assetData = cost.asset.data;
        const assetType = cost.asset.assetType.contentType;

        // 二进制数据转 Blob
        const blob = new Blob([assetData], { type: assetType });

        // createImageBitmap 异步解码
        const bitmap = await createImageBitmap(blob, {
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none'
        });

        const tex = gl3d.createTexture();
        gl3d.bindTexture(gl3d.TEXTURE_2D, tex);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_S, gl3d.REPEAT);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_T, gl3d.REPEAT);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MIN_FILTER, gl3d.LINEAR);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MAG_FILTER, gl3d.LINEAR);
        gl3d.texImage2D(gl3d.TEXTURE_2D, 0, gl3d.RGBA, gl3d.RGBA, gl3d.UNSIGNED_BYTE, bitmap);

        bitmap.close();

        textures.set(NAME, tex);
        console.log(`Vapor3D: Texture [${NAME}] loaded successfully (Async).`);

      } catch (e) {
        textures.delete(NAME);
        console.error(`Vapor3D: Failed to load texture [${NAME}]:`, e);
      }
    }
    async tex_LoadFromURL({ U, NAME }) {
      if (textures.has(NAME)) return;
      const urlString = String(U).trim();
      if (!urlString) return;

      textures.set(NAME, "loading");

      try {
        const uint8Data = await fetchBinaryData(urlString);

        const blob = new Blob([uint8Data]);

        const bitmap = await createImageBitmap(blob, {
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none'
        });

        const tex = gl3d.createTexture();
        gl3d.bindTexture(gl3d.TEXTURE_2D, tex);

        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_S, gl3d.REPEAT);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_T, gl3d.REPEAT);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MIN_FILTER, gl3d.LINEAR);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MAG_FILTER, gl3d.LINEAR);

        gl3d.texImage2D(gl3d.TEXTURE_2D, 0, gl3d.RGBA, gl3d.RGBA, gl3d.UNSIGNED_BYTE, bitmap);

        bitmap.close();
        textures.set(NAME, tex);

        console.log(`Vapor3D: Texture [${NAME}] loaded from URL successfully.`);
      } catch (e) {
        textures.delete(NAME);
        console.error(`Vapor3D: Failed to load URL texture [${NAME}]:`, e);
      }
    }
    async tex_LoadFromBuffer({ NAME, ID }) {
      if (textures.has(NAME) && textures.get(NAME) !== "loading") return;
      if (!ID) return;

      const registry = window.Vapor3D_Registry;
      if (!registry || !registry.has(ID)) {
        console.error(`Vapor3D: Global pool ID [${ID}] not found. It may not be loaded or has been flushed.`);
        return;
      }

      textures.set(NAME, "loading");
      const data = registry.get(ID);

      try {
        let blob;
        if (data instanceof Uint8Array) {
          blob = new Blob([data]);
        } else if (typeof data === 'string') {
          const response = await fetch(data);
          blob = await response.blob();
        } else {
          throw new Error(`Vapor3D: Unsupported data type: "${String(url).substring(0, 20)}..."`);
        }

        const bitmap = await createImageBitmap(blob, {
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none'
        });

        const tex = gl3d.createTexture();
        gl3d.bindTexture(gl3d.TEXTURE_2D, tex);

        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_S, gl3d.REPEAT);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_WRAP_T, gl3d.REPEAT);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MIN_FILTER, gl3d.LINEAR);
        gl3d.texParameteri(gl3d.TEXTURE_2D, gl3d.TEXTURE_MAG_FILTER, gl3d.LINEAR);

        gl3d.texImage2D(gl3d.TEXTURE_2D, 0, gl3d.RGBA, gl3d.RGBA, gl3d.UNSIGNED_BYTE, bitmap);

        bitmap.close();

        textures.set(NAME, tex);
        console.log(`Vapor3D: Texture [${NAME}] loaded from [${ID}] successfully.`);

      } catch (e) {
        textures.delete(NAME);
        console.error(`Vapor3D: Failed to load Buffer texture [${NAME}]:`, e);
      }
    }
    async tex_LoadKTXFromURL({ U, NAME }) {
      if (textures.has(NAME)) return;
      const urlString = String(U).trim();
      if (!urlString) return;

      textures.set(NAME, "loading");

      try {
        const uint8Data = await fetchBinaryData(urlString);
        // 获取 ArrayBuffer 传给解析器
        const buffer = uint8Data.buffer;

        const ktx = _parseKTX(buffer);

        const tex = gl3d.createTexture();
        gl3d.bindTexture(gl3d.TEXTURE_CUBE_MAP, tex);

        // 强制 4 字节对齐
        gl3d.pixelStorei(gl3d.UNPACK_ALIGNMENT, 4);

        ktx.mipmaps.forEach(mip => {
          const target = gl3d.TEXTURE_CUBE_MAP_POSITIVE_X + mip.face;
          gl3d.texImage2D(
            target,
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

        const mipCount = ktx.numberOfMipmapLevels;
        gl3d.texParameteri(gl3d.TEXTURE_CUBE_MAP, gl3d.TEXTURE_MAX_LEVEL, mipCount - 1);

        const minFilter = (mipCount > 1) ? gl3d.LINEAR_MIPMAP_LINEAR : gl3d.LINEAR;
        gl3d.texParameteri(gl3d.TEXTURE_CUBE_MAP, gl3d.TEXTURE_MIN_FILTER, minFilter);
        gl3d.texParameteri(gl3d.TEXTURE_CUBE_MAP, gl3d.TEXTURE_MAG_FILTER, gl3d.LINEAR);

        gl3d.texParameteri(gl3d.TEXTURE_CUBE_MAP, gl3d.TEXTURE_WRAP_S, gl3d.CLAMP_TO_EDGE);
        gl3d.texParameteri(gl3d.TEXTURE_CUBE_MAP, gl3d.TEXTURE_WRAP_T, gl3d.CLAMP_TO_EDGE);
        gl3d.texParameteri(gl3d.TEXTURE_CUBE_MAP, gl3d.TEXTURE_WRAP_R, gl3d.CLAMP_TO_EDGE);

        textures.set(NAME, tex);
        console.log(`Vapor3D: KTX Cubemap [${NAME}] loaded successfully.`);
      } catch (e) {
        textures.delete(NAME);
        console.error(`Vapor3D: KTX Load Error:`, e);
      }
    }
    tex_Destroy({ NAME }) {
      const item = texturePool.cache.get(NAME);
      if (item) {
        textures.delete(item.id);
      }
      texturePool.destroy(NAME);
    }

    m4_Identity() {
      return JSON.stringify(m4.identity());
    }
    m4_Perspective({ F, A, N, F2 }) {
      const mat = m4.perspective(F * Math.PI / 180, A, N, F2);
      return JSON.stringify(mat);
    }
    m4_LookAt({ EX, EY, EZ, TX, TY, TZ, UX, UY, UZ }) {
      const mat = m4.lookAt([EX, EY, EZ], [TX, TY, TZ], [UX, UY, UZ]);
      return JSON.stringify(mat);
    }
    m4_Translate({ M, X, Y, Z }, util) {
      // _parseInput 会处理 M 是嵌套积木传来的 JSON 还是列表名
      const baseMat = _parseInput(M, util) || m4.identity();
      const mat = m4.translate(baseMat, X, Y, Z);
      return JSON.stringify(mat);
    }
    m4_Rotate({ M, AXIS, DEG }, util) {
      const baseMat = _parseInput(M, util) || m4.identity();
      const rad = DEG * Math.PI / 180;
      let mat;
      if (AXIS === "X") mat = m4.xRotate(baseMat, rad);
      else if (AXIS === "Y") mat = m4.yRotate(baseMat, rad);
      else mat = m4.zRotate(baseMat, rad); // Z 轴
      return JSON.stringify(mat);
    }
    m4_Scale({ M, X, Y, Z }, util) {
      const baseMat = _parseInput(M, util) || m4.identity();
      const sx = (X === "" || X === null) ? 1 : Number(X);
      const sy = (Y === "" || Y === null) ? 1 : Number(Y);
      const sz = (Z === "" || Z === null) ? 1 : Number(Z);
      const mat = m4.scale(baseMat, sx, sy, sz);
      return JSON.stringify(mat);
    }
    m4_Multiply({ A, B }, util) {
      const matA = _parseInput(A, util) || m4.identity();
      const matB = _parseInput(B, util) || m4.identity();
      const mat = m4.multiply(matA, matB);
      return JSON.stringify(mat);
    }
    // 没写，留在这
    m4_Inverse({ M }, util) {
      const baseMat = _parseInput(M, util) || m4.identity();
      const mat = m4.inverse(baseMat) || m4.identity();
      return JSON.stringify(mat);
    }

    v3_Init({ ID, X, Y, Z }) {
      vectors.set(ID, [X, Y, Z]);
    }
    v3_Modify({ ID, OP, OTHER }) {
      const a = vectors.get(ID);
      const b = vectors.get(OTHER);
      if (!a || !b) return;

      let result;
      if (OP === "+") result = m4.v3_add(a, b);
      else if (OP === "-") result = m4.v3_sub(a, b);
      else if (OP === "mul") result = m4.v3_mul(a, b);

      if (result) vectors.set(ID, result);
    }
    v3_Normalize({ ID }) {
      const v = vectors.get(ID);
      if (v) vectors.set(ID, m4.v3_normalize(v));
    }
    v3_ApplyMatrix({ ID, M }, util) {
      const v = vectors.get(ID);
      const mat = _parseInput(M, util) || m4.identity();
      if (v) vectors.set(ID, m4.v3_transform(v, mat));
    }
    v3_Get({ ID, COMP }) {
      const v = vectors.get(ID);
      if (!v) return 0;
      const map = { "X": 0, "Y": 1, "Z": 2 };
      return v[map[COMP]] ?? 0;
    }
  }

  const vapor3DInstance = new Vapor3D();

  runtime.on('PROJECT_STOP_ALL', () => {
    console.log("Vapor3D: Project stopped, clearing resources...");
    isTakenOver = false;
    if (canvas3d) canvas3d.style.display = 'none';
    vapor3DInstance.gl_ResetResources();
  });
  runtime.on('PROJECT_LOADED', () => {
    vapor3DInstance.gl_ResetResources();
  });

  Scratch.extensions.register(vapor3DInstance);
})(Scratch);