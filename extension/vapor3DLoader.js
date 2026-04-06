/**
 * @name Vapor3DLoader (Omni-Series)
 * @id vapor3DLoader
 * @description High-performance, Three.js-free 3D Asset Loader for Vapor3D Engine. 
 * Optimized for Scratch/TurboWarp with 100% offline GLB/GLTF parsing.
 * * @author Joy_Ful <https://github.com/JoyFul721>
 * @license MPL-2.0
 * @version 1.5.0 - Pure Local Architecture (No-Three.js)
 * * [Technical Specification]
 * - Core Parser: Integrated gltf-loader-ts (MIT) within an 11KB IIFE bundler.
 * - Rendering: Native WebGL2.0 PBR (Albedo, Normal, ORM) with Direct List Injection.
 * - Deployment: 100% Local. Zero external dependencies or CDN requirements.
 * * [Credits & Legal]
 * - gltf-loader-ts (c) 2026 bwasty (MIT License).
 * * (c) 2026 Joy_Ful. Some rights reserved.
 * This software is distributed under the Mozilla Public License 2.0.
 * The embedded gltf-loader-ts is governed by its respective MIT license.
 */

var V3D_UTILS = (() => { var O = Object.create; var L = Object.defineProperty; var P = Object.getOwnPropertyDescriptor; var M = Object.getOwnPropertyNames; var C = Object.getPrototypeOf, F = Object.prototype.hasOwnProperty; var x = (c, r) => () => (r || c((r = { exports: {} }).exports, r), r.exports), N = (c, r) => { for (var o in r) L(c, o, { get: r[o], enumerable: !0 }) }, _ = (c, r, o, t) => { if (r && typeof r == "object" || typeof r == "function") for (let n of M(r)) !F.call(c, n) && n !== o && L(c, n, { get: () => r[n], enumerable: !(t = P(r, n)) || t.enumerable }); return c }; var D = (c, r, o) => (o = c != null ? O(C(c)) : {}, _(r || !c || !c.__esModule ? L(o, "default", { value: c, enumerable: !0 }) : o, c)), S = c => _(L({}, "__esModule", { value: !0 }), c); var A = x((G, U) => { U.exports = (function (c) { var r = {}; function o(t) { if (r[t]) return r[t].exports; var n = r[t] = { i: t, l: !1, exports: {} }; return c[t].call(n.exports, n, n.exports, o), n.l = !0, n.exports } return o.m = c, o.c = r, o.d = function (t, n, l) { o.o(t, n) || Object.defineProperty(t, n, { enumerable: !0, get: l }) }, o.r = function (t) { typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(t, "__esModule", { value: !0 }) }, o.t = function (t, n) { if (1 & n && (t = o(t)), 8 & n || 4 & n && typeof t == "object" && t && t.__esModule) return t; var l = Object.create(null); if (o.r(l), Object.defineProperty(l, "default", { enumerable: !0, value: t }), 2 & n && typeof t != "string") for (var p in t) o.d(l, p, function (v) { return t[v] }.bind(null, p)); return l }, o.n = function (t) { var n = t && t.__esModule ? function () { return t.default } : function () { return t }; return o.d(n, "a", n), n }, o.o = function (t, n) { return Object.prototype.hasOwnProperty.call(t, n) }, o.p = "", o(o.s = 7) })([function (c, r, o) { "use strict"; Object.defineProperty(r, "__esModule", { value: !0 }), r.LoadingManager = class { constructor() { this.urlModifier = void 0, this.onStart = void 0, this.onProgress = void 0, this.onLoad = void 0, this.onError = void 0, this.isLoading = !1, this.itemsLoaded = 0, this.itemsTotal = 0 } itemStart(t) { this.itemsTotal++, !this.isLoading && this.onStart && this.onStart(t, this.itemsLoaded, this.itemsTotal), this.isLoading = !0 } itemEnd(t) { this.itemsLoaded++, this.onProgress && this.onProgress(t, this.itemsLoaded, this.itemsTotal), this.itemsLoaded === this.itemsTotal && (this.isLoading = !1, this.onLoad && this.onLoad()) } itemError(t) { this.onError && this.onError(t) } resolveURL(t) { return this.urlModifier ? this.urlModifier(t) : t } } }, function (c, r, o) { "use strict"; var t = this && this.__awaiter || function (u, i, e, s) { return new (e || (e = Promise))(function (a, f) { function h(y) { try { m(s.next(y)) } catch (g) { f(g) } } function b(y) { try { m(s.throw(y)) } catch (g) { f(g) } } function m(y) { y.done ? a(y.value) : new e(function (g) { g(y.value) }).then(h, b) } m((s = s.apply(u, i || [])).next()) }) }; Object.defineProperty(r, "__esModule", { value: !0 }); let n = o(3), l = o(0); r.GLTF_COMPONENT_TYPE_ARRAYS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, r.GLTF_ELEMENTS_PER_TYPE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }, r.GltfAsset = class { constructor(u, i, e, s = new l.LoadingManager) { this.gltf = u, this.glbData = e, this.bufferData = new p(this, i, s), this.imageData = new v(this, i, s) } bufferViewData(u) { return t(this, void 0, void 0, function* () { if (!this.gltf.bufferViews) throw new Error("No buffer views found."); let i = this.gltf.bufferViews[u], e = yield this.bufferData.get(i.buffer), s = i.byteLength || 0, a = i.byteOffset || 0, f = e.buffer, h = e.byteOffset; return new Uint8Array(f, h + a, s) }) } accessorData(u) { return t(this, void 0, void 0, function* () { if (!this.gltf.accessors) throw new Error("No accessors views found."); let i = this.gltf.accessors[u], e = r.GLTF_ELEMENTS_PER_TYPE[i.type], s; if (i.bufferView !== void 0) s = yield this.bufferViewData(i.bufferView); else { let a = r.GLTF_COMPONENT_TYPE_ARRAYS[i.componentType].BYTES_PER_ELEMENT * e * i.count; s = new Uint8Array(a) } if (i.sparse) { let { count: a, indices: f, values: h } = i.sparse, b = r.GLTF_COMPONENT_TYPE_ARRAYS[f.componentType], m = yield this.bufferViewData(f.bufferView), y = new b(m.buffer, m.byteOffset + (f.byteOffset || 0), a); b = r.GLTF_COMPONENT_TYPE_ARRAYS[i.componentType], m = yield this.bufferViewData(h.bufferView); let g = new b((yield this.bufferViewData(h.bufferView)).buffer, m.byteOffset + (h.byteOffset || 0), a * e); i.bufferView && (s = new Uint8Array(s)); let T = new r.GLTF_COMPONENT_TYPE_ARRAYS[i.componentType](s.buffer); for (let w = 0; w < a; w++)for (let E = 0; E < e; E++)T[e * y[w] + E] = g[e * w + E] } return s }) } preFetchAll() { return t(this, void 0, void 0, function* () { return Promise.all([this.bufferData.preFetchAll(), this.imageData.preFetchAll()]) }) } }; class p { constructor(i, e, s) { this.bufferCache = [], this.asset = i, this.baseUri = e, this.manager = s, this.loader = new n.FileLoader(s), this.loader.responseType = "arraybuffer" } get(i) { return t(this, void 0, void 0, function* () { if (this.bufferCache[i] !== void 0) return this.bufferCache[i]; let e = this.asset.gltf; if (!e.buffers) throw new Error("No buffers found."); let s = e.buffers[i]; if (s.uri === void 0) { if (i !== 0) throw new Error("GLB container is required to be the first buffer"); if (this.asset.glbData === void 0) throw new Error("invalid gltf: buffer has no uri nor is there a GLB buffer"); return this.asset.glbData.binaryChunk } let a = d(s.uri, this.baseUri), f = yield this.loader.load(a), h = new Uint8Array(f); return this.bufferCache[i] = h, h }) } preFetchAll() { return t(this, void 0, void 0, function* () { let i = this.asset.gltf.buffers; return i ? Promise.all(i.map((e, s) => this.get(s))) : [] }) } } r.BufferData = p; class v { constructor(i, e, s) { this.crossOrigin = "anonymous", this.imageCache = [], this.asset = i, this.baseUri = e, this.manager = s } get(i) { return t(this, void 0, void 0, function* () { if (this.imageCache[i] !== void 0) return this.imageCache[i]; let e = this.asset.gltf; if (!e.images) throw new Error("No images found."); let s = e.images[i], a, f = !1; if (s.bufferView !== void 0) { let b = yield this.asset.bufferViewData(s.bufferView); f = !0; let m = new Blob([b], { type: s.mimeType }); a = URL.createObjectURL(m) } else { if (s.uri === void 0) throw new Error("Invalid glTF: image must either have a `uri` or a `bufferView`"); a = this.manager.resolveURL(d(s.uri, this.baseUri)) } let h = new Image; return h.crossOrigin = this.crossOrigin, new Promise((b, m) => { h.onerror = (() => { m(`Failed to load ${a}`), this.manager.itemEnd(a), this.manager.itemError(a) }), h.onload = (() => { f && URL.revokeObjectURL(a), this.imageCache[i] = h, b(h), this.manager.itemEnd(a) }), h.src = a, this.manager.itemStart(a) }) }) } preFetchAll() { return t(this, void 0, void 0, function* () { let i = this.asset.gltf.images; return i ? Promise.all(i.map((e, s) => this.get(s))) : [] }) } } function d(u, i) { return typeof u != "string" || u === "" ? "" : /^(https?:)?\/\//i.test(u) || /^data:.*,.*$/i.test(u) || /^blob:.*$/i.test(u) ? u : i + u } r.ImageData = v, r.resolveURL = d }, function (c, r, o) { "use strict"; Object.defineProperty(r, "__esModule", { value: !0 }), r.LoaderUtils = class { static decodeText(t) { if (typeof TextDecoder < "u") return new TextDecoder().decode(t); let n = ""; for (let l of t) n += String.fromCharCode(l); return decodeURIComponent(escape(n)) } static extractUrlBase(t) { let n = t.split("/"); return n.length === 1 ? "./" : (n.pop(), n.join("/") + "/") } } }, function (c, r, o) { "use strict"; Object.defineProperty(r, "__esModule", { value: !0 }), r.FileLoader = class { constructor(t) { this.runningRequests = {}, this.manager = t } load(t, n) { if (this.path !== void 0 && (t = this.path + t), t = this.manager.resolveURL(t), this.runningRequests[t]) return this.runningRequests[t]; let l = new Promise((p, v) => { let d = new XMLHttpRequest; d.open("GET", t, !0); let u = this; d.onload = function (i) { let e = this.response; this.status === 0 ? (console.warn("FileLoader: HTTP Status 0 received."), p(e), u.manager.itemEnd(t)) : this.status === 200 ? (p(e), u.manager.itemEnd(t)) : (v({ url: t, status: this.status, statusText: d.statusText }), u.manager.itemEnd(t), u.manager.itemError(t)), delete u.runningRequests[t] }, d.onprogress = (i => { n && n(i) }), d.onerror = function (i) { v({ url: t, status: this.status, statusText: d.statusText }), u.manager.itemEnd(t), u.manager.itemError(t), delete u.runningRequests[t] }, this.responseType && (d.responseType = this.responseType), this.withCredentials && (d.withCredentials = this.withCredentials), this.mimeType && d.overrideMimeType && d.overrideMimeType(this.mimeType !== void 0 ? this.mimeType : "text/plain"); for (let i in this.requestHeaders) d.setRequestHeader(i, this.requestHeaders[i]); d.send(null), this.manager.itemStart(t) }); return this.runningRequests[t] = l, l } setRequestHeader(t, n) { return this.requestHeaders[t] = n, this } } }, function (c, r, o) { "use strict"; Object.defineProperty(r, "__esModule", { value: !0 }) }, function (c, r, o) { "use strict"; Object.defineProperty(r, "__esModule", { value: !0 }); let t = o(2); r.BINARY_HEADER_MAGIC = "glTF"; let n = 12, l = { JSON: 1313821514, BIN: 5130562 }; r.GLTFBinaryData = class { constructor(p) { let v = new DataView(p, 0, n), d = t.LoaderUtils.decodeText(new Uint8Array(p, 0, 4)), u = v.getUint32(4, !0); if (v.getUint32(8, !0), d !== r.BINARY_HEADER_MAGIC) throw new Error("Unsupported glTF-Binary header."); if (u < 2) throw new Error("Unsupported legacy binary file detected."); let i = new DataView(p, n), e = 0; for (; e < i.byteLength;) { let s = i.getUint32(e, !0); e += 4; let a = i.getUint32(e, !0); if (e += 4, a === l.JSON) { let f = new Uint8Array(p, n + e, s); this.json = t.LoaderUtils.decodeText(f) } else if (a === l.BIN) { let f = n + e; this.binaryChunk = new Uint8Array(p, f, s) } e += s } if (this.json === null) throw new Error("glTF-Binary: JSON content not found.") } } }, function (c, r, o) { "use strict"; var t = this && this.__awaiter || function (e, s, a, f) { return new (a || (a = Promise))(function (h, b) { function m(T) { try { g(f.next(T)) } catch (w) { b(w) } } function y(T) { try { g(f.throw(T)) } catch (w) { b(w) } } function g(T) { T.done ? h(T.value) : new a(function (w) { w(T.value) }).then(m, y) } g((f = f.apply(e, s || [])).next()) }) }; function n(e) { for (var s in e) r.hasOwnProperty(s) || (r[s] = e[s]) } Object.defineProperty(r, "__esModule", { value: !0 }); let l = o(3), p = o(5), v = o(1), d = o(2), u = o(0), i = o(4); r.gltf = i, n(o(1)), n(o(0)), r.GltfLoader = class { constructor(e) { this.manager = e || new u.LoadingManager } load(e, s) { return t(this, void 0, void 0, function* () { let a = d.LoaderUtils.extractUrlBase(e), f = new l.FileLoader(this.manager); f.responseType = "arraybuffer"; let h = yield f.load(e, s); return yield this.parse(h, a) }) } loadFromFiles(e) { return t(this, void 0, void 0, function* () { let s, a; for (let [y, g] of e) g.name.match(/\.(gltf|glb)$/) && (s = g, a = y.replace(g.name, "")); if (!s) throw new Error("No .gltf or .glb asset found."); let f = typeof s == "string" ? s : URL.createObjectURL(s), h = d.LoaderUtils.extractUrlBase(f), b = []; this.manager.urlModifier = (y => { let g = a + y.replace(h, "").replace(/^(\.?\/)/, ""); if (e.has(g)) { let T = e.get(g), w = URL.createObjectURL(T); return b.push(w), w } return y }); let m = yield this.load(f); return yield m.preFetchAll(), URL.revokeObjectURL(f), b.forEach(URL.revokeObjectURL), m }) } parse(e, s) { return t(this, void 0, void 0, function* () { let a, f; a = typeof e == "string" ? e : d.LoaderUtils.decodeText(new Uint8Array(e, 0, 4)) === p.BINARY_HEADER_MAGIC ? (f = new p.GLTFBinaryData(e)).json : d.LoaderUtils.decodeText(new Uint8Array(e)); let h = JSON.parse(a); if (h.asset === void 0 || h.asset.version[0] < 2) throw new Error("Unsupported asset. glTF versions >=2.0 are supported."); return new v.GltfAsset(h, s, f, this.manager) }) } } }, function (c, r, o) { c.exports = o(6) }]) }); var j = {}; N(j, { GltfLoader: () => R.GltfLoader }); var R = D(A()); return S(j); })();


(function (Scratch) {
  "use strict";


  class Vapor3DLoader {
    constructor() {
      try {
        this.loader = new V3D_UTILS.GltfLoader();
        this.isReady = true;
        console.log("%c[Vapor3DLoader] Engine initialized successfully.", "color: #00ff00;");
      } catch (e) {
        this.loader = null;
        this.isReady = false;
        console.error("[Vapor3DLoader] Engine initialization failed:", e);
      }

      this.loadingCount = 0;
    }

    getInfo() {
      return {
        id: 'vapor3DLoader',
        name: 'Vapor3DLoader',
        color1: '#484c55',
        blocks: [
          {
            opcode: 'syncHandle',
            blockType: Scratch.BlockType.COMMAND,
            text: 'get Vapor3D layer'
          },
          {
            opcode: 'isLoaderReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'Vapor3DLoader ready?'
          },
          {
            opcode: 'loadModel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'load modle [NAME] from [DATA]',
            arguments: {
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/WaterBottle/glTF-Binary/WaterBottle.glb' },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'sample' }
            }
          },
          {
            opcode: 'getLoadStatus',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get load status'
          },
          {
            opcode: 'getMeshCount',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get model [NAME] mesh count',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'sample' }
            }
          },
          {
            opcode: 'getMeshName',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get model [NAME] mesh [IDX] name',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'sample' },
              IDX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'getMeshTextureID',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get model [NAME] mesh [IDX] [TYPE] texture ID',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'sample' },
              IDX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'texTypeMenu',
                defaultValue: 'albedo'
              }
            }
          },
          {
            opcode: 'getMeshPBRParam',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get model [NAME] mesh [IDX] material [PARAM]',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'sample' },
              IDX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PARAM: {
                type: Scratch.ArgumentType.STRING,
                menu: 'pbrParamMenu',
                defaultValue: 'roughness'
              }
            }
          }
        ],
        menus: {
          texTypeMenu: [
            { text: 'Albedo', value: 'albedoID' },
            { text: 'Normal', value: 'normalID' },
            { text: 'ORM', value: 'ormID' },
            { text: 'Emissive', value: 'emissiveID' }
          ],
          pbrParamMenu: [
            { text: 'Roughness', value: 'roughness' },
            { text: 'Metalness', value: 'metalness' }
          ]
        }
      };
    }

    async syncHandle() {
      console.log("%c[Vapor3D-Loader] Internal Engine Ready", "color: #00ff00; font-weight: bold;");
      this.isReady = true;
      return Promise.resolve();
    }

    isLoaderReady() {
      return this.isReady;
    }

    async loadModel(args) {
      const name = args.NAME;
      const data = args.DATA;

      let url = String(data).trim();
      if (url.length > 200 && !url.startsWith('http') && !url.startsWith('data:')) {
        url = 'data:application/octet-stream;base64,' + url;
      }

      this.loadingCount++;
      if (typeof V3D_Exchange !== 'undefined') V3D_Exchange.status = "loading";

      try {
        const asset = await this.loader.load(url);
        await this._extract(name, asset);

        this.loadingCount--;
        if (this.loadingCount === 0 && typeof V3D_Exchange !== 'undefined') {
          V3D_Exchange.status = "ready";
        }
      } catch (err) {
        if (typeof V3D_Exchange !== 'undefined') V3D_Exchange.status = "error";
        console.error(`[Vapor3D-Loader] Failed: ${name}`, err);
      }
    }






    async _extract(modelName, asset) {
      const gl = window.gl3d || (typeof gl3d !== 'undefined' ? gl3d : null);
      if (!gl) return;

      await asset.preFetchAll();

      console.group(`%c[Vapor3D-Loader] Asset Extraction: ${modelName}`, "color: #00ffff; font-weight: bold;");

      V3D_Exchange.models[modelName] = { meshes: [] };
      const model = V3D_Exchange.models[modelName];

      for (const mesh of asset.gltf.meshes) {
        for (const prim of mesh.primitives) {

          const posIdx = prim.attributes.POSITION;
          if (posIdx === undefined) continue;

          const rawPos = await asset.accessorData(posIdx);
          const positions = new Float32Array(rawPos.buffer, rawPos.byteOffset, rawPos.byteLength / 4).slice();

          const uvIdx = prim.attributes.TEXCOORD_0;
          const uvs = (uvIdx !== undefined && asset.gltf.accessors[uvIdx])
            ? new Float32Array((await asset.accessorData(uvIdx)).buffer, (await asset.accessorData(uvIdx)).byteOffset, (await asset.accessorData(uvIdx)).byteLength / 4).slice()
            : null;

          const normIdx = prim.attributes.NORMAL;
          const normals = (normIdx !== undefined && asset.gltf.accessors[normIdx])
            ? new Float32Array((await asset.accessorData(normIdx)).buffer, (await asset.accessorData(normIdx)).byteOffset, (await asset.accessorData(normIdx)).byteLength / 4).slice()
            : null;

          let indices = null;
          let indexType = gl.UNSIGNED_SHORT;

          if (prim.indices !== undefined && asset.gltf.accessors[prim.indices]) {
            const rawIndices = await asset.accessorData(prim.indices);
            const accessor = asset.gltf.accessors[prim.indices];

            if (accessor.componentType === 5125) { // UNSIGNED_INT
              indices = new Uint32Array(rawIndices.buffer, rawIndices.byteOffset, rawIndices.byteLength / 4).slice();
              indexType = gl.UNSIGNED_INT;
            } else { // UNSIGNED_SHORT
              indices = new Uint16Array(rawIndices.buffer, rawIndices.byteOffset, rawIndices.byteLength / 2).slice();
              indexType = gl.UNSIGNED_SHORT;
            }
          }

          let matInfo = { albedoID: "Null", normalID: "Null", ormID: "Null", emissiveID: "Null", baseColor: [1, 1, 1, 1] };
          const matIdx = prim.material;

          if (matIdx !== undefined && asset.gltf.materials && asset.gltf.materials[matIdx]) {
            const matData = asset.gltf.materials[matIdx];

            if (matData.pbrMetallicRoughness) {
              const pbr = matData.pbrMetallicRoughness;
              if (pbr.baseColorFactor) matInfo.baseColor = pbr.baseColorFactor;
              if (pbr.baseColorTexture) {
                matInfo.albedoID = await this._getTexture(gl, asset, pbr.baseColorTexture.index, modelName, "Albedo");
              }
              if (pbr.metallicRoughnessTexture) {
                matInfo.ormID = await this._getTexture(gl, asset, pbr.metallicRoughnessTexture.index, modelName, "ORM");
              }
            }
            if (matData.normalTexture) {
              matInfo.normalID = await this._getTexture(gl, asset, matData.normalTexture.index, modelName, "Normal");
            }
          }

          model.meshes.push({
            name: mesh.name || `mesh_${model.meshes.length}`,
            material: matInfo,
            count: indices ? indices.length : positions.length / 3,
            indexType: indexType,
            attributes: {
              position: positions,
              uv: uvs,
              normal: normals
            },
            indices: indices
          });

          // console.log(`%c[Mesh] %c${mesh.name || 'unnamed'} %c(V:${positions.length / 3}, I:${indices ? indices.length : 0})`,
          // "color: #ffcc00;", "color: #fff;", "color: #888;");
        }
      }
      console.groupEnd();
    }
    async _getTexture(gl, asset, texIdx, modelName, typeName) {
      try {
        const texture = asset.gltf.textures[texIdx];
        if (!texture) return "Null";

        let imgIdx = texture.source;

        if (imgIdx === undefined && texture.extensions) {
          // console.log(`[Vapor3DLoader] Texture ${texIdx} has no root source, attempting to extract from extensions...`);
          for (const extName in texture.extensions) {
            const ext = texture.extensions[extName];
            if (ext && typeof ext.source === 'number') {
              imgIdx = ext.source;
              // console.log(`[Vapor3DLoader] Found image source in extension ${extName}: ${imgIdx}`);
              break;
            }
          }
        }

        if (imgIdx === undefined) {
          console.error(`[Vapor3DLoader] Error: Failed to find any image source for texture index ${texIdx}. Object data:`, texture);
          return "Null";
        }

        const rawImg = await asset.imageData.get(imgIdx);
        const img = (rawImg && rawImg.image) ? rawImg.image : rawImg;

        if (!img || img.width === 0) {
          console.warn(`[Vapor3DLoader] Image source ${imgIdx} is either not fully loaded or contains empty data.`);
          return "Null";
        }

        const uniqueID = `V3D_TEX_${modelName}_${typeName}_${imgIdx}`;

        if (typeof V3D_TexturePool === 'undefined') {
          console.error("[Vapor3DLoader] V3D_TexturePool undefined！");
          return "Null";
        }

        if (V3D_TexturePool.has(uniqueID)) return uniqueID;

        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        V3D_TexturePool.set(uniqueID, tex);

        console.log(`%c[Vapor3DLoader] %cTexture injected into GPU: ${uniqueID}`, "color:white; background:green; padding:2px;", "");
        return uniqueID;

      } catch (e) {
        console.error(`[Vapor3DLoader] Texture processing failed:`, e);
        return "Null";
      }
    }




    getLoadStatus() {
      return V3D_Exchange.status;
    }

    getMeshCount(args) {
      const model = V3D_Exchange.models[args.NAME];
      return model ? model.meshes.length : 0;
    }

    getMeshName(args) {
      const model = V3D_Exchange.models[args.NAME];
      const idx = args.IDX;
      if (!model || !model.meshes[idx]) return "Null";
      return model.meshes[idx].name;
    }

    getMeshTextureID(args) {
      const model = V3D_Exchange.models[args.NAME];
      const mesh = model ? model.meshes[args.IDX] : null;
      return (mesh && mesh.material) ? mesh.material[args.TYPE] : "Null";
    }

    getMeshPBRParam(args) {
      const model = V3D_Exchange.models[args.NAME];
      const mesh = model ? model.meshes[args.IDX] : null;
      if (!mesh || !mesh.material) return 0;

      const val = mesh.material[args.PARAM];
      return Array.isArray(val) ? JSON.stringify(val) : val;
    }
  }
  Scratch.extensions.register(new Vapor3DLoader());

})(Scratch);