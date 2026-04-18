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