export class Mesh {
    constructor(name, count, indexType) {
        this.name = name;
        this.count = count;
        this.indexType = indexType;
        this.attributes = {
            position: null,
            uv: null,
            normal: null
        };
        this.indices = null;
        this.material = {
            albedoID: "Null",
            normalID: "Null",
            ormID: "Null",
            emissiveID: "Null",
            baseColor: [1, 1, 1, 1],
            roughness: 1,
            metalness: 1
        };
    }
}

export class Model {
    constructor(name) {
        this.name = name;
        this.meshes = [];
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
    }

    getMesh(index) {
        return this.meshes[index] || null;
    }

    destroy() {
        // GC
        this.meshes = [];
    }
}