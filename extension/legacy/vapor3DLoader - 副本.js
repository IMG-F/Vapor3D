/**
 * @name Vapor3DLoader
 * @id vapor3DLoader
 * @description High-performance 3D Asset Loader for Vapor3D Engine. 
 * Supports asynchronous GLB/GLTF parsing and KTX2 GPU texture transcoding.
 * * @author Joy_Ful <https://github.com/JoyFul721>
 * @license MPL-2.0 AND BSD-3-Clause
 * @version 1.0.0 - Async Synchronization
 * * Credits:
 * - Three.js Loaders (BSD-3-Clause) for GLTF & KTX2 parsing logic.
 * - Basis Universal (Apache-2.0/Zlib) for GPU texture compression.
 * * (c) 2026 Joy_Ful. Some rights reserved.
 * This software is distributed under the Mozilla Public License 2.0.
 * Third-party components are governed by their respective licenses.
 */

(function (Scratch) {
  "use strict";

  const GLTF_URL = "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
  const KTX2_URL = "https://esm.sh/three@0.160.0/examples/jsm/loaders/KTX2Loader.js";
  const BASIS_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/";

  class Vapor3DLoader {
    constructor() {
      this.loader = null;
      this.ktx2Loader = null;
      this.isReady = false;
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

    syncHandle() {
      if (this.isReady) return;
      const gl = window.gl3d || (typeof gl3d !== 'undefined' ? gl3d : null);

      if (!gl) {
        console.error("%c[Vapor3D-Loader] Context not found!", "color: #ff4444;");
        return;
      }

      return new Promise(async (resolve) => {
        try {
          const { GLTFLoader } = await import(GLTF_URL);
          const { KTX2Loader } = await import(KTX2_URL);

          const fakeRenderer = {
            getContext: () => gl,
            capabilities: { isWebGL2: true },
            extensions: {
              has: (n) => !!gl.getExtension(n),
              get: (n) => gl.getExtension(n)
            }
          };

          this.ktx2Loader = new KTX2Loader().setTranscoderPath(BASIS_URL).detectSupport(fakeRenderer);
          this.loader = new GLTFLoader().setKTX2Loader(this.ktx2Loader);

          this.isReady = true;
          console.log("%c[Vapor3D-Loader] Environment Ready", "color: #00ff00; font-weight: bold;");
          resolve();
        } catch (e) {
          console.error("%c[Vapor3D-Loader] Loader failed!", "color: #ff4444;", e);
          resolve();
        }
      });
    }

    isLoaderReady() {
      return this.isReady;
    }

    loadModel(args) {
      const name = args.NAME;
      const data = args.DATA;

      if (!this.isReady) {
        console.warn("Vapor3D-Loader not ready. Please call syncHandle first.");
        return;
      }

      let url = String(data).trim();
      if (url.length > 200 && !url.startsWith('http') && !url.startsWith('data:')) {
        url = 'data:application/octet-stream;base64,' + url;
      }

      // 返回 Promise，直到模型解析完成并存入 V3D_Exchange 后才执行后续积木
      return new Promise((resolve) => {
        this.loadingCount++;
        V3D_Exchange.status = "loading";

        this.loader.load(url, (gltf) => {
          this._extract(name, gltf);
          this.loadingCount--;
          if (this.loadingCount === 0) {
            V3D_Exchange.status = "ready";
          }
          resolve();
        }, undefined, (err) => {
          V3D_Exchange.status = "error";
          console.error(`[Vapor3D-Loader] Failed: ${name}`, err);
          resolve();
        });
      });
    }
    _extract(modelName, gltf) {
      const gl = window.gl3d || (typeof gl3d !== 'undefined' ? gl3d : null);
      if (!gl) return console.error("[Loader] gl3d context not found.");

      console.group(`%c[Vapor3D-Loader] Asset Extraction: ${modelName}`, "color: #00ffff; font-weight: bold;");

      V3D_Exchange.models[modelName] = { meshes: [] };
      const model = V3D_Exchange.models[modelName];
      const uploadTexture = (threeTex, typeName) => {
        if (!threeTex || !threeTex.image) return "Null";
        const uniqueID = `V3D_TEX_${modelName}_${typeName}_${threeTex.uuid.substring(0, 8)}`;
        if (V3D_TexturePool.has(uniqueID)) return uniqueID;

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, threeTex.flipY);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, threeTex.image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        V3D_TexturePool.set(uniqueID, tex);
        console.log(`%c[Texture] %cAuto-Uploaded: ${uniqueID}`, "color: #00ff00;", "color: #888;");
        return uniqueID;
      };

      gltf.scene.traverse((node) => {
        if (node.isMesh) {
          const geo = node.geometry.index ? node.geometry : node.geometry.toNonIndexed();
          const mat = node.material;
          const materialInfo = {
            name: mat.name,
            albedoID: uploadTexture(mat.map, "base"),
            normalID: uploadTexture(mat.normalMap, "norm"),
            ormID: uploadTexture(mat.roughnessMap || mat.metalnessMap, "orm"),
            emissiveID: uploadTexture(mat.emissiveMap, "emis"),
            baseColor: [mat.color.r, mat.color.g, mat.color.b, mat.opacity],
            roughness: mat.roughness !== undefined ? mat.roughness : 1,
            metalness: mat.metalness !== undefined ? mat.metalness : 0,
            emissive: [mat.emissive.r, mat.emissive.g, mat.emissive.b]
          };

          const meshAsset = {
            name: node.name,
            material: materialInfo,
            count: geo.attributes.position.count,
            indices: geo.index ? new (geo.index.array.constructor)(geo.index.array) : null,
            attributes: {
              position: new Float32Array(geo.attributes.position.array),
              normal: geo.attributes.normal ? new Float32Array(geo.attributes.normal.array) : null,
              uv: geo.attributes.uv ? new Float32Array(geo.attributes.uv.array) : null,
              tangent: geo.attributes.tangent ? new Float32Array(geo.attributes.tangent.array) : null
            }
          };
          model.meshes.push(meshAsset);
          console.log(`%c[Mesh] %c${node.name} (Material: ${mat.name})`, "color: #ffcc00;", "color: #fff;");
        }
      });
      console.groupEnd();
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