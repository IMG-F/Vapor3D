/**
 * @name Vapor3DLoader (Omni-Series)
 * @id vapor3DLoader
 * @description High-performance, Three.js-free 3D Asset Loader for Vapor3D Engine. 
 * Optimized for Scratch/TurboWarp with offline GLB/GLTF parsing and native PBR extraction.
 * * @author Joy_Ful <https://github.com/JoyFul721>
 * @license MPL-2.0
 * @version 1.5.0 - Pure Local Architecture (No-Three.js)
 * * [Technical Specification]
 * - Parser: Integrated gltf-loader-ts (MIT) within a 11KB IIFE bundler.
 * - Architecture: Direct-to-WebGL2.0 with byte-aligned accessor reinterpretation.
 * - Deployment: 100% Local Deployment. No external CDN or heavy-weight runtime required.
 * * [Credits & Legal]
 * - gltf-loader-ts (c) 2026 bwasty (MIT License).
 * - Inspired by Simple3D (Xeltalliv) and Arkos extension ecosystems.
 * * (c) 2026 Joy_Ful. Some rights reserved.
 * This software is distributed under the Mozilla Public License 2.0.
 * Third-party components (gltf-loader-ts) are governed by their respective licenses.
 */
var V3D_UTILS = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/gltf-loader-ts/lib/gltf-loader.js
  var require_gltf_loader = __commonJS({
    "node_modules/gltf-loader-ts/lib/gltf-loader.js"(exports, module) {
      module.exports = (function (e) {
        var t = {};
        function r(i) {
          if (t[i]) return t[i].exports;
          var s = t[i] = { i, l: false, exports: {} };
          return e[i].call(s.exports, s, s.exports, r), s.l = true, s.exports;
        }
        __name(r, "r");
        return r.m = e, r.c = t, r.d = function (e2, t2, i) {
          r.o(e2, t2) || Object.defineProperty(e2, t2, { enumerable: true, get: i });
        }, r.r = function (e2) {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e2, "__esModule", { value: true });
        }, r.t = function (e2, t2) {
          if (1 & t2 && (e2 = r(e2)), 8 & t2) return e2;
          if (4 & t2 && "object" == typeof e2 && e2 && e2.__esModule) return e2;
          var i = /* @__PURE__ */ Object.create(null);
          if (r.r(i), Object.defineProperty(i, "default", { enumerable: true, value: e2 }), 2 & t2 && "string" != typeof e2) for (var s in e2) r.d(i, s, function (t3) {
            return e2[t3];
          }.bind(null, s));
          return i;
        }, r.n = function (e2) {
          var t2 = e2 && e2.__esModule ? function () {
            return e2.default;
          } : function () {
            return e2;
          };
          return r.d(t2, "a", t2), t2;
        }, r.o = function (e2, t2) {
          return Object.prototype.hasOwnProperty.call(e2, t2);
        }, r.p = "", r(r.s = 7);
      })([function (e, t, r) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: true });
        t.LoadingManager = class {
          constructor() {
            this.urlModifier = void 0, this.onStart = void 0, this.onProgress = void 0, this.onLoad = void 0, this.onError = void 0, this.isLoading = false, this.itemsLoaded = 0, this.itemsTotal = 0;
          }
          itemStart(e2) {
            this.itemsTotal++, !this.isLoading && this.onStart && this.onStart(e2, this.itemsLoaded, this.itemsTotal), this.isLoading = true;
          }
          itemEnd(e2) {
            this.itemsLoaded++, this.onProgress && this.onProgress(e2, this.itemsLoaded, this.itemsTotal), this.itemsLoaded === this.itemsTotal && (this.isLoading = false, this.onLoad && this.onLoad());
          }
          itemError(e2) {
            this.onError && this.onError(e2);
          }
          resolveURL(e2) {
            return this.urlModifier ? this.urlModifier(e2) : e2;
          }
        };
      }, function (e, t, r) {
        "use strict";
        var i = this && this.__awaiter || function (e2, t2, r2, i2) {
          return new (r2 || (r2 = Promise))(function (s2, n2) {
            function o2(e3) {
              try {
                u2(i2.next(e3));
              } catch (e4) {
                n2(e4);
              }
            }
            __name(o2, "o");
            function a2(e3) {
              try {
                u2(i2.throw(e3));
              } catch (e4) {
                n2(e4);
              }
            }
            __name(a2, "a");
            function u2(e3) {
              e3.done ? s2(e3.value) : new r2(function (t3) {
                t3(e3.value);
              }).then(o2, a2);
            }
            __name(u2, "u");
            u2((i2 = i2.apply(e2, t2 || [])).next());
          });
        };
        Object.defineProperty(t, "__esModule", { value: true });
        const s = r(3), n = r(0);
        t.GLTF_COMPONENT_TYPE_ARRAYS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, t.GLTF_ELEMENTS_PER_TYPE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
        t.GltfAsset = class {
          constructor(e2, t2, r2, i2 = new n.LoadingManager()) {
            this.gltf = e2, this.glbData = r2, this.bufferData = new o(this, t2, i2), this.imageData = new a(this, t2, i2);
          }
          bufferViewData(e2) {
            return i(this, void 0, void 0, function* () {
              if (!this.gltf.bufferViews) throw new Error("No buffer views found.");
              const t2 = this.gltf.bufferViews[e2], r2 = yield this.bufferData.get(t2.buffer), i2 = t2.byteLength || 0, s2 = t2.byteOffset || 0, n2 = r2.buffer, o2 = r2.byteOffset;
              return new Uint8Array(n2, o2 + s2, i2);
            });
          }
          accessorData(e2) {
            return i(this, void 0, void 0, function* () {
              if (!this.gltf.accessors) throw new Error("No accessors views found.");
              const r2 = this.gltf.accessors[e2], i2 = t.GLTF_ELEMENTS_PER_TYPE[r2.type];
              let s2;
              if (void 0 !== r2.bufferView) s2 = yield this.bufferViewData(r2.bufferView);
              else {
                const e3 = t.GLTF_COMPONENT_TYPE_ARRAYS[r2.componentType].BYTES_PER_ELEMENT * i2 * r2.count;
                s2 = new Uint8Array(e3);
              }
              if (r2.sparse) {
                const { count: e3, indices: n2, values: o2 } = r2.sparse;
                let a2 = t.GLTF_COMPONENT_TYPE_ARRAYS[n2.componentType], u2 = yield this.bufferViewData(n2.bufferView);
                const f = new a2(u2.buffer, u2.byteOffset + (n2.byteOffset || 0), e3);
                a2 = t.GLTF_COMPONENT_TYPE_ARRAYS[r2.componentType], u2 = yield this.bufferViewData(o2.bufferView);
                const c = new a2((yield this.bufferViewData(o2.bufferView)).buffer, u2.byteOffset + (o2.byteOffset || 0), e3 * i2);
                r2.bufferView && (s2 = new Uint8Array(s2));
                const h = new t.GLTF_COMPONENT_TYPE_ARRAYS[r2.componentType](s2.buffer);
                for (let t2 = 0; t2 < e3; t2++) for (let e4 = 0; e4 < i2; e4++) h[i2 * f[t2] + e4] = c[i2 * t2 + e4];
              }
              return s2;
            });
          }
          preFetchAll() {
            return i(this, void 0, void 0, function* () {
              return Promise.all([this.bufferData.preFetchAll(), this.imageData.preFetchAll()]);
            });
          }
        };
        class o {
          static {
            __name(this, "o");
          }
          constructor(e2, t2, r2) {
            this.bufferCache = [], this.asset = e2, this.baseUri = t2, this.manager = r2, this.loader = new s.FileLoader(r2), this.loader.responseType = "arraybuffer";
          }
          get(e2) {
            return i(this, void 0, void 0, function* () {
              if (void 0 !== this.bufferCache[e2]) return this.bufferCache[e2];
              const t2 = this.asset.gltf;
              if (!t2.buffers) throw new Error("No buffers found.");
              const r2 = t2.buffers[e2];
              if (void 0 === r2.uri) {
                if (0 !== e2) throw new Error("GLB container is required to be the first buffer");
                if (void 0 === this.asset.glbData) throw new Error("invalid gltf: buffer has no uri nor is there a GLB buffer");
                return this.asset.glbData.binaryChunk;
              }
              const i2 = u(r2.uri, this.baseUri), s2 = yield this.loader.load(i2), n2 = new Uint8Array(s2);
              return this.bufferCache[e2] = n2, n2;
            });
          }
          preFetchAll() {
            return i(this, void 0, void 0, function* () {
              const e2 = this.asset.gltf.buffers;
              return e2 ? Promise.all(e2.map((e3, t2) => this.get(t2))) : [];
            });
          }
        }
        t.BufferData = o;
        class a {
          static {
            __name(this, "a");
          }
          constructor(e2, t2, r2) {
            this.crossOrigin = "anonymous", this.imageCache = [], this.asset = e2, this.baseUri = t2, this.manager = r2;
          }
          get(e2) {
            return i(this, void 0, void 0, function* () {
              if (void 0 !== this.imageCache[e2]) return this.imageCache[e2];
              const t2 = this.asset.gltf;
              if (!t2.images) throw new Error("No images found.");
              const r2 = t2.images[e2];
              let i2, s2 = false;
              if (void 0 !== r2.bufferView) {
                const e3 = yield this.asset.bufferViewData(r2.bufferView);
                s2 = true;
                const t3 = new Blob([e3], { type: r2.mimeType });
                i2 = URL.createObjectURL(t3);
              } else {
                if (void 0 === r2.uri) throw new Error("Invalid glTF: image must either have a `uri` or a `bufferView`");
                i2 = this.manager.resolveURL(u(r2.uri, this.baseUri));
              }
              const n2 = new Image();
              return n2.crossOrigin = this.crossOrigin, new Promise((t3, r3) => {
                n2.onerror = (() => {
                  r3(`Failed to load ${i2}`), this.manager.itemEnd(i2), this.manager.itemError(i2);
                }), n2.onload = (() => {
                  s2 && URL.revokeObjectURL(i2), this.imageCache[e2] = n2, t3(n2), this.manager.itemEnd(i2);
                }), n2.src = i2, this.manager.itemStart(i2);
              });
            });
          }
          preFetchAll() {
            return i(this, void 0, void 0, function* () {
              const e2 = this.asset.gltf.images;
              return e2 ? Promise.all(e2.map((e3, t2) => this.get(t2))) : [];
            });
          }
        }
        function u(e2, t2) {
          return "string" != typeof e2 || "" === e2 ? "" : /^(https?:)?\/\//i.test(e2) ? e2 : /^data:.*,.*$/i.test(e2) ? e2 : /^blob:.*$/i.test(e2) ? e2 : t2 + e2;
        }
        __name(u, "u");
        t.ImageData = a, t.resolveURL = u;
      }, function (e, t, r) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: true });
        t.LoaderUtils = class {
          static decodeText(e2) {
            if ("undefined" != typeof TextDecoder) return new TextDecoder().decode(e2);
            let t2 = "";
            for (const r2 of e2) t2 += String.fromCharCode(r2);
            return decodeURIComponent(escape(t2));
          }
          static extractUrlBase(e2) {
            const t2 = e2.split("/");
            return 1 === t2.length ? "./" : (t2.pop(), t2.join("/") + "/");
          }
        };
      }, function (e, t, r) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: true });
        t.FileLoader = class {
          constructor(e2) {
            this.runningRequests = {}, this.manager = e2;
          }
          load(e2, t2) {
            if (void 0 !== this.path && (e2 = this.path + e2), e2 = this.manager.resolveURL(e2), this.runningRequests[e2]) return this.runningRequests[e2];
            const r2 = new Promise((r3, i) => {
              const s = new XMLHttpRequest();
              s.open("GET", e2, true);
              const n = this;
              s.onload = function (t3) {
                const o = this.response;
                0 === this.status ? (console.warn("FileLoader: HTTP Status 0 received."), r3(o), n.manager.itemEnd(e2)) : 200 === this.status ? (r3(o), n.manager.itemEnd(e2)) : (i({ url: e2, status: this.status, statusText: s.statusText }), n.manager.itemEnd(e2), n.manager.itemError(e2)), delete n.runningRequests[e2];
              }, s.onprogress = ((e3) => {
                t2 && t2(e3);
              }), s.onerror = function (t3) {
                i({ url: e2, status: this.status, statusText: s.statusText }), n.manager.itemEnd(e2), n.manager.itemError(e2), delete n.runningRequests[e2];
              }, this.responseType && (s.responseType = this.responseType), this.withCredentials && (s.withCredentials = this.withCredentials), this.mimeType && s.overrideMimeType && s.overrideMimeType(void 0 !== this.mimeType ? this.mimeType : "text/plain");
              for (const e3 in this.requestHeaders) s.setRequestHeader(e3, this.requestHeaders[e3]);
              s.send(null), this.manager.itemStart(e2);
            });
            return this.runningRequests[e2] = r2, r2;
          }
          setRequestHeader(e2, t2) {
            return this.requestHeaders[e2] = t2, this;
          }
        };
      }, function (e, t, r) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: true });
      }, function (e, t, r) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: true });
        const i = r(2);
        t.BINARY_HEADER_MAGIC = "glTF";
        const s = 12, n = { JSON: 1313821514, BIN: 5130562 };
        t.GLTFBinaryData = class {
          constructor(e2) {
            const r2 = new DataView(e2, 0, s), o = i.LoaderUtils.decodeText(new Uint8Array(e2, 0, 4)), a = r2.getUint32(4, true);
            if (r2.getUint32(8, true), o !== t.BINARY_HEADER_MAGIC) throw new Error("Unsupported glTF-Binary header.");
            if (a < 2) throw new Error("Unsupported legacy binary file detected.");
            const u = new DataView(e2, s);
            let f = 0;
            for (; f < u.byteLength;) {
              const t2 = u.getUint32(f, true);
              f += 4;
              const r3 = u.getUint32(f, true);
              if (f += 4, r3 === n.JSON) {
                const r4 = new Uint8Array(e2, s + f, t2);
                this.json = i.LoaderUtils.decodeText(r4);
              } else if (r3 === n.BIN) {
                const r4 = s + f;
                this.binaryChunk = new Uint8Array(e2, r4, t2);
              }
              f += t2;
            }
            if (null === this.json) throw new Error("glTF-Binary: JSON content not found.");
          }
        };
      }, function (e, t, r) {
        "use strict";
        var i = this && this.__awaiter || function (e2, t2, r2, i2) {
          return new (r2 || (r2 = Promise))(function (s2, n2) {
            function o2(e3) {
              try {
                u2(i2.next(e3));
              } catch (e4) {
                n2(e4);
              }
            }
            __name(o2, "o");
            function a2(e3) {
              try {
                u2(i2.throw(e3));
              } catch (e4) {
                n2(e4);
              }
            }
            __name(a2, "a");
            function u2(e3) {
              e3.done ? s2(e3.value) : new r2(function (t3) {
                t3(e3.value);
              }).then(o2, a2);
            }
            __name(u2, "u");
            u2((i2 = i2.apply(e2, t2 || [])).next());
          });
        };
        function s(e2) {
          for (var r2 in e2) t.hasOwnProperty(r2) || (t[r2] = e2[r2]);
        }
        __name(s, "s");
        Object.defineProperty(t, "__esModule", { value: true });
        const n = r(3), o = r(5), a = r(1), u = r(2), f = r(0), c = r(4);
        t.gltf = c, s(r(1)), s(r(0));
        t.GltfLoader = class {
          constructor(e2) {
            this.manager = e2 || new f.LoadingManager();
          }
          load(e2, t2) {
            return i(this, void 0, void 0, function* () {
              const r2 = u.LoaderUtils.extractUrlBase(e2), i2 = new n.FileLoader(this.manager);
              i2.responseType = "arraybuffer";
              const s2 = yield i2.load(e2, t2);
              return yield this.parse(s2, r2);
            });
          }
          loadFromFiles(e2) {
            return i(this, void 0, void 0, function* () {
              let t2, r2;
              for (const [i3, s3] of e2) s3.name.match(/\.(gltf|glb)$/) && (t2 = s3, r2 = i3.replace(s3.name, ""));
              if (!t2) throw new Error("No .gltf or .glb asset found.");
              const i2 = "string" == typeof t2 ? t2 : URL.createObjectURL(t2), s2 = u.LoaderUtils.extractUrlBase(i2), n2 = [];
              this.manager.urlModifier = ((t3) => {
                const i3 = r2 + t3.replace(s2, "").replace(/^(\.?\/)/, "");
                if (e2.has(i3)) {
                  const t4 = e2.get(i3), r3 = URL.createObjectURL(t4);
                  return n2.push(r3), r3;
                }
                return t3;
              });
              const o2 = yield this.load(i2);
              return yield o2.preFetchAll(), URL.revokeObjectURL(i2), n2.forEach(URL.revokeObjectURL), o2;
            });
          }
          parse(e2, t2) {
            return i(this, void 0, void 0, function* () {
              let r2, i2 = void 0;
              r2 = "string" == typeof e2 ? e2 : u.LoaderUtils.decodeText(new Uint8Array(e2, 0, 4)) === o.BINARY_HEADER_MAGIC ? (i2 = new o.GLTFBinaryData(e2)).json : u.LoaderUtils.decodeText(new Uint8Array(e2));
              const s2 = JSON.parse(r2);
              if (void 0 === s2.asset || s2.asset.version[0] < 2) throw new Error("Unsupported asset. glTF versions >=2.0 are supported.");
              return new a.GltfAsset(s2, t2, i2, this.manager);
            });
          }
        };
      }, function (e, t, r) {
        e.exports = r(6);
      }]);
    }
  });

  // bundler.js
  var bundler_exports = {};
  __export(bundler_exports, {
    GltfLoader: () => import_gltf_loader_ts.GltfLoader
  });
  var import_gltf_loader_ts = __toESM(require_gltf_loader());
  return __toCommonJS(bundler_exports);
})();


(function (Scratch) {
  "use strict";


  class Vapor3DLoader {
    constructor() {
      try {
        this.loader = new V3D_UTILS.GltfLoader();
        this.isReady = true;
        console.log("%c[Vapor3D] 内置解析引擎已就绪", "color: #00ff00;");
      } catch (e) {
        this.loader = null;
        this.isReady = false;
        console.error("[Vapor3D] 解析引擎初始化失败:", e);
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

      // 确保异步资源加载完毕
      await asset.preFetchAll();

      console.group(`%c[Vapor3D-Loader] Asset Extraction: ${modelName}`, "color: #00ffff; font-weight: bold;");

      V3D_Exchange.models[modelName] = { meshes: [] };
      const model = V3D_Exchange.models[modelName];

      // 遍历 Mesh
      for (const mesh of asset.gltf.meshes) {
        for (const prim of mesh.primitives) {

          // --- 1. 几何体数据提取 ---
          const posIdx = prim.attributes.POSITION;
          if (posIdx === undefined) continue;

          // 提取顶点 (slice() 是为了解决 BufferOffset 偏移导致的残缺问题)
          const rawPos = await asset.accessorData(posIdx);
          const positions = new Float32Array(rawPos.buffer, rawPos.byteOffset, rawPos.byteLength / 4).slice();

          // 提取 UV (可选)
          const uvIdx = prim.attributes.TEXCOORD_0;
          const uvs = (uvIdx !== undefined && asset.gltf.accessors[uvIdx])
            ? new Float32Array((await asset.accessorData(uvIdx)).buffer, (await asset.accessorData(uvIdx)).byteOffset, (await asset.accessorData(uvIdx)).byteLength / 4).slice()
            : null;

          // 提取法线 (可选)
          const normIdx = prim.attributes.NORMAL;
          const normals = (normIdx !== undefined && asset.gltf.accessors[normIdx])
            ? new Float32Array((await asset.accessorData(normIdx)).buffer, (await asset.accessorData(normIdx)).byteOffset, (await asset.accessorData(normIdx)).byteLength / 4).slice()
            : null;

          // 【修复点】初始化 indices 变量，防止 ReferenceError
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

          // --- 2. 材质与贴图处理 ---
          let matInfo = { albedoID: "Null", normalID: "Null", ormID: "Null", emissiveID: "Null", baseColor: [1, 1, 1, 1] };
          const matIdx = prim.material;

          if (matIdx !== undefined && asset.gltf.materials && asset.gltf.materials[matIdx]) {
            const matData = asset.gltf.materials[matIdx];

            // PBR 参数提取
            if (matData.pbrMetallicRoughness) {
              const pbr = matData.pbrMetallicRoughness;
              if (pbr.baseColorFactor) matInfo.baseColor = pbr.baseColorFactor;

              // 基础色贴图
              if (pbr.baseColorTexture) {
                matInfo.albedoID = await this._autoUpload(gl, asset, pbr.baseColorTexture.index, modelName, "Albedo");
              }
              // 金属粗糙度 (ORM)
              if (pbr.metallicRoughnessTexture) {
                matInfo.ormID = await this._autoUpload(gl, asset, pbr.metallicRoughnessTexture.index, modelName, "ORM");
              }
            }

            // 法线贴图
            if (matData.normalTexture) {
              matInfo.normalID = await this._autoUpload(gl, asset, matData.normalTexture.index, modelName, "Normal");
            }
          }

          // --- 3. 组装网格对象 ---
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

          console.log(`%c[Mesh] %c${mesh.name || 'unnamed'} %c(V:${positions.length / 3}, I:${indices ? indices.length : 0})`,
            "color: #ffcc00;", "color: #fff;", "color: #888;");
        }
      }
      console.groupEnd();
    }/**
     * 自动上传逻辑 (逻辑重构)
     */
    async _autoUpload(gl, asset, texIdx, modelName, typeName) {
      try {
        const texture = asset.gltf.textures[texIdx];
        if (!texture) return "Null";

        // --- 深度查找图像索引 (imgIdx) ---
        let imgIdx = texture.source;

        // 如果根部没有 source，去 extensions 里挖
        if (imgIdx === undefined && texture.extensions) {
          console.log(`[Vapor3D] 纹理 ${texIdx} 根部无 source，尝试从扩展中提取...`);
          for (const extName in texture.extensions) {
            const ext = texture.extensions[extName];
            if (ext && typeof ext.source === 'number') {
              imgIdx = ext.source;
              console.log(`[Vapor3D] 从扩展 ${extName} 中找到了图像源: ${imgIdx}`);
              break;
            }
          }
        }

        if (imgIdx === undefined) {
          console.error(`[Vapor3D] 严重错误: 无法从纹理索引 ${texIdx} 中找到任何图像源。对象数据:`, texture);
          return "Null";
        }

        // --- 异步获取图像对象 ---
        const rawImg = await asset.imageData.get(imgIdx);
        // 适配 gltf-loader-ts 的返回格式
        const img = (rawImg && rawImg.image) ? rawImg.image : rawImg;

        if (!img || img.width === 0) {
          console.warn(`[Vapor3D] 图像源 ${imgIdx} 还没有加载完成或数据为空`);
          return "Null";
        }

        // --- 生成全局唯一 ID ---
        const uniqueID = `V3D_TEX_${modelName}_${typeName}_${imgIdx}`;

        // --- 统一存入 V3D_TexturePool ---
        if (typeof V3D_TexturePool === 'undefined') {
          console.error("致命错误: 全局 V3D_TexturePool 未定义！");
          return "Null";
        }

        if (V3D_TexturePool.has(uniqueID)) return uniqueID;

        // --- WebGL 上传逻辑 ---
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // GLTF 规范：通常不翻转 Y
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // 存入全局唯一的纹理池
        V3D_TexturePool.set(uniqueID, tex);

        console.log(`%c[Texture Success] %c贴图已注入显存: ${uniqueID}`, "color:white; background:green; padding:2px;", "");
        return uniqueID;

      } catch (e) {
        console.error(`[Vapor3D] 贴图处理失败:`, e);
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