import { GltfLoader } from 'gltf-loader-ts';
import { Texture2D } from '../lib/Core.js';
import { Model, Mesh } from '../lib/Loader.js';
import { VAO } from '../lib/Core.js';

export class Vapor3DLoader {
    /**
     * @param {Object} coreState - 主拓展的资源字典
     */
    constructor(coreState) {
        this.core = coreState;
        this.isReady = false;
        this.loadingCount = 0;
        this.status = "idle";

        try {
            this.loader = new GltfLoader();
            this.isReady = true;
            console.log("%c[Vapor3D] loader initialized successfully.", "color: #00ff00;");
        } catch (e) {
            this.loader = null;
            console.error("[Vapor3D] Loader initialization failed:", e);
        }
    }

    isLoaderReady() {
        return this.isReady;
    }

    getLoadStatus() {
        return this.status;
    }

    async loadModel({ NAME, DATA }) {
        if (!this.loader) return;
        let url = String(DATA).trim();
        if (url.length > 200 && !url.startsWith('http') && !url.startsWith('data:')) {
            url = 'data:application/octet-stream;base64,' + url;
        }

        this.loadingCount++;
        this.status = "loading";

        try {
            const asset = await this.loader.load(url);
            await this._extract(NAME, asset);

            this.loadingCount--;
            if (this.loadingCount === 0) this.status = "ready";
        } catch (err) {
            this.status = "error";
            console.error(`[Vapor3D] Loading failed: ${NAME}`, err);
        }
    }

    async _extract(modelName, asset) {
        if (!this.core.webgl) return;
        const gl = this.core.webgl.gl;

        const model = new Model(modelName);
        this.core.models.set(modelName, model);

        await asset.preFetchAll();

        let flatIdx = 0;

        console.log(`%c[Vapor3D-Loader] Asset Extraction: ${modelName}`, "color: #00ffff; font-weight: bold;");

        for (const gltfMesh of asset.gltf.meshes) {
            for (const prim of gltfMesh.primitives) {

                // pos
                const posIdx = prim.attributes.POSITION;
                if (posIdx === undefined) continue;
                const rawPos = await asset.accessorData(posIdx);
                const positions = new Float32Array(rawPos.buffer, rawPos.byteOffset, rawPos.byteLength / 4).slice();

                // new VAO
                const vaoID = `${modelName}:${flatIdx}`;
                const vao = new VAO(gl);
                vao.addBuffer(positions, 0, 3); // Position 永远在 loc 0

                // normal
                const normIdx = prim.attributes.NORMAL;
                if (normIdx !== undefined) {
                    const rawNorm = await asset.accessorData(normIdx);
                    const normals = new Float32Array(rawNorm.buffer, rawNorm.byteOffset, rawNorm.byteLength / 4).slice();
                    vao.addBuffer(normals, 1, 3);
                }

                // uv
                const uvIdx = prim.attributes.TEXCOORD_0;
                if (uvIdx !== undefined) {
                    const rawUV = await asset.accessorData(uvIdx);
                    const uvs = new Float32Array(rawUV.buffer, rawUV.byteOffset, rawUV.byteLength / 4).slice();
                    vao.addBuffer(uvs, 2, 2);
                }

                // index
                if (prim.indices !== undefined) {
                    const rawIndices = await asset.accessorData(prim.indices);
                    const accessor = asset.gltf.accessors[prim.indices];
                    const isUint32 = accessor.componentType === 5125;
                    const indices = isUint32
                        ? new Uint32Array(rawIndices.buffer, rawIndices.byteOffset, rawIndices.byteLength / 4).slice()
                        : new Uint16Array(rawIndices.buffer, rawIndices.byteOffset, rawIndices.byteLength / 2).slice();
                    vao.setIndices(indices, isUint32);
                } else {
                    vao.defaultCount = positions.length / 3;
                }

                // 以图元为单位
                let matInfo = { albedoID: "Null", normalID: "Null", ormID: "Null", emissiveID: "Null", baseColor: [1, 1, 1, 1], roughness: 1, metalness: 1 };
                const matIdx = prim.material;

                if (matIdx !== undefined && asset.gltf.materials && asset.gltf.materials[matIdx]) {
                    const matData = asset.gltf.materials[matIdx];
                    if (matData.pbrMetallicRoughness) {
                        const pbr = matData.pbrMetallicRoughness;
                        if (pbr.baseColorFactor) matInfo.baseColor = pbr.baseColorFactor;
                        if (pbr.roughnessFactor !== undefined) matInfo.roughness = pbr.roughnessFactor;
                        if (pbr.metallicFactor !== undefined) matInfo.metalness = pbr.metallicFactor;

                        if (pbr.baseColorTexture) {
                            matInfo.albedoID = await this._getTexture(asset, pbr.baseColorTexture.index, modelName, "Albedo");
                        }
                        if (pbr.metallicRoughnessTexture) {
                            matInfo.ormID = await this._getTexture(asset, pbr.metallicRoughnessTexture.index, modelName, "ORM");
                        }
                    }
                    if (matData.normalTexture) {
                        matInfo.normalID = await this._getTexture(asset, matData.normalTexture.index, modelName, "Normal");
                    }
                    if (matData.emissiveTexture) {
                        matInfo.emissiveID = await this._getTexture(asset, matData.emissiveTexture.index, modelName, "Emissive");
                    }
                }

                this.core.vaos.set(vaoID, vao);

                const meshMeta = new Mesh(gltfMesh.name || `mesh_${flatIdx}`, vao.defaultCount, vao.elementType);
                meshMeta.material = matInfo;
                model.addMesh(meshMeta);

                console.log(`[V3D-Loader] ${vaoID} extracted. Verts: ${positions.length / 3}`);
                flatIdx++;
            }
        }
    }

    async _getTexture(asset, texIdx, modelName, typeName) {
        try {
            const texture = asset.gltf.textures[texIdx];
            if (!texture) return "Null";

            let imgIdx = texture.source;
            if (imgIdx === undefined && texture.extensions) {
                for (const extName in texture.extensions) {
                    if (texture.extensions[extName] && typeof texture.extensions[extName].source === 'number') {
                        imgIdx = texture.extensions[extName].source;
                        break;
                    }
                }
            }
            if (imgIdx === undefined) return "Null";

            const rawImg = await asset.imageData.get(imgIdx);
            const img = (rawImg && rawImg.image) ? rawImg.image : rawImg;
            if (!img || img.width === 0) return "Null";

            const uniqueID = `V3D_TEX_${modelName}_${typeName}_${imgIdx}`;

            if (this.core.textures.has(uniqueID)) return uniqueID;

            const tex = new Texture2D(this.core.webgl.gl);
            tex.uploadImageBitmap(img);
            tex.generateMipmap();
            tex.setFilter("LINEAR_MIPMAP_LINEAR", "LINEAR");

            this.core.textures.set(uniqueID, tex);
            return uniqueID;

        } catch (e) {
            console.error(`[Vapor3DLoader] Texture error:`, e);
            return "Null";
        }
    }

    getMeshCount({ NAME }) {
        const model = this.core.models.get(NAME);
        return model ? model.meshes.length : 0;
    }

    getMeshName({ NAME, IDX }) {
        const mesh = this.core.models.get(NAME)?.getMesh(IDX);
        return mesh ? mesh.name : "Null";
    }

    getVaoID({ NAME, IDX, PRIM }) {
        return `${NAME}_mesh${IDX}_prim${PRIM}`;
    }

    getMeshTextureID({ NAME, IDX, TYPE }) {
        const mesh = this.core.models.get(NAME)?.getMesh(IDX);
        return mesh ? mesh.material[TYPE] : "Null";
    }

    getMeshPBRParam({ NAME, IDX, PARAM }) {
        const mesh = this.core.models.get(NAME)?.getMesh(IDX);
        if (!mesh) return 0;
        const val = mesh.material[PARAM];
        return Array.isArray(val) ? JSON.stringify(val) : val;
    }
}