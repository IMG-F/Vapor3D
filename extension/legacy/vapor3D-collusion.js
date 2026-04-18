// Name: OmniCollision
// ID: omniCollision
// Description: High-performance BVH-based 3D collision engine.
// By: Joy_Ful <https://github.com/JoyFul114514>
// License: MPL-2.0
// Version: 1.0.0
(function (Scratch) {
    'use strict';

    let runtime = null;
    if (Scratch.vm) {
        runtime = Scratch.vm.runtime;
    } else if (typeof window !== 'undefined' && window.vm) {
        runtime = window.vm.runtime;
    }

    class BVHCollisionExtension {
        constructor(injectedRuntime) {
            this.runtime = injectedRuntime || runtime;
            this.bvh = null;

            // 最后的碰撞结果
            this.lastResult = {
                hit: false,
                normal: [0, 1, 0],
                depth: 0,
                point: [0, 0, 0]
            };

            this.debugInfo = { checks: 0, candidates: 0, buildTime: 0, totalTris: 0 };
            this.physicsState = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, isGrounded: false };
        }

        getInfo() {
            return {
                id: 'omniCollision',
                name: 'OmniCollision',
                color1: '#969bb3',
                blocks: [
                    {
                        opcode: 'buildFromList',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '初始化 BVH 列表 [LIST_NAME]',
                        arguments: { LIST_NAME: { type: Scratch.ArgumentType.STRING, menu: 'LIST_MENU' } }
                    },
                    {
                        opcode: 'checkCapsuleBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: '胶囊体检测: 底 [X] [Y] [Z] R [R] H [H]',
                        arguments: {
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                            H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 40 }
                        }
                    },
                    {
                        opcode: 'stepPhysics',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '物理步进 Pos:[X],[Y],[Z] Vel:[VX],[VY],[VZ] R:[R] H:[H] dt:[DT]',
                        arguments: {
                            X: { type: Scratch.ArgumentType.NUMBER }, Y: { type: Scratch.ArgumentType.NUMBER }, Z: { type: Scratch.ArgumentType.NUMBER },
                            VX: { type: Scratch.ArgumentType.NUMBER }, VY: { type: Scratch.ArgumentType.NUMBER }, VZ: { type: Scratch.ArgumentType.NUMBER },
                            R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 }, H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 40 },
                            DT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.033 }
                        }
                    },
                    {
                        opcode: 'getPhysicsProp',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '物理结果 [PROP]',
                        arguments: { PROP: { type: Scratch.ArgumentType.STRING, menu: 'PHYSICS_MENU' } }
                    },
                    {
                        opcode: 'getCollisionInfo',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '最后碰撞数据 [INFO_TYPE]',
                        arguments: { INFO_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'INFO_MENU' } }
                    },
                    {
                        opcode: 'getDebug',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '调试',
                        disableMonitor: false
                    },
                ],
                menus: {
                    LIST_MENU: { acceptReporters: true, items: '_getAllLists' },
                    INFO_MENU: { items: ['法线X', '法线Y', '法线Z', '穿透深度'] },
                    PHYSICS_MENU: { items: ['新X', '新Y', '新Z', '新VX', '新VY', '新VZ', '落地状态'] }
                }
            };
        }

        // -------------------Math-----------------------

        _sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
        _add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
        _scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
        _dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
        _lenSq(v) { return v[0] * v[0] + v[1] * v[1] + v[2] * v[2]; }
        _cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
        _normalize(v) {
            const l = Math.sqrt(this._lenSq(v));
            return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
        }

        // 点到线段最近点
        _closestPtPointSegment(p, a, b) {
            const ab = this._sub(b, a);
            let t = this._dot(this._sub(p, a), ab) / this._lenSq(ab);
            return this._add(a, this._scale(ab, Math.max(0, Math.min(1, t))));
        }

        // 点到三角形最近点
        _closestPtPointTriangle(p, a, b, c) {
            const ab = this._sub(b, a), ac = this._sub(c, a), ap = this._sub(p, a);
            const d1 = this._dot(ab, ap), d2 = this._dot(ac, ap);
            if (d1 <= 0 && d2 <= 0) return a;
            const bp = this._sub(p, b), d3 = this._dot(ab, bp), d4 = this._dot(ac, bp);
            if (d3 >= 0 && d4 <= d3) return b;
            const vc = d1 * d4 - d3 * d2;
            if (vc <= 0 && d1 >= 0 && d3 <= 0) return this._add(a, this._scale(ab, d1 / (d1 - d3)));
            const cp = this._sub(p, c), d5 = this._dot(ab, cp), d6 = this._dot(ac, cp);
            if (d6 >= 0 && d5 <= d6) return c;
            const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) return this._add(a, this._scale(ac, d2 / (d2 - d6)));
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) return this._add(b, this._scale(this._sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
            const den = 1 / (va + vb + vc);
            return this._add(a, this._add(this._scale(ab, vb * den), this._scale(ac, vc * den)));
        }

        // --------------------Physics-------------------

        _solveCapsuleCollision(x, y, z, r, h, updateGlobal = true) {
            const result = { hit: false, normal: [0, 1, 0], depth: 0, point: [0, 0, 0] };
            if (!this.bvh) return result;

            const base = [x, y + r, z];
            const top = [x, y + h - r, z];
            const box = { min: [x - r, y, z - r], max: [x + r, y + h, z + r] };

            const candidates = [];
            this._query(this.bvh, box, candidates);

            let maxDepth = -Infinity;

            for (const tri of candidates) {
                const pBase = this._closestPtPointTriangle(base, tri.v[0], tri.v[1], tri.v[2]);
                const pTop = this._closestPtPointTriangle(top, tri.v[0], tri.v[1], tri.v[2]);
                // 取这两个点中离中心轴最近的
                let bestP = pBase;
                let distSqBase = this._lenSq(this._sub(base, pBase));
                let distSqTop = this._lenSq(this._sub(top, pTop));

                let distSq = distSqBase;
                let centerPoint = base;

                if (distSqTop < distSqBase) {
                    distSq = distSqTop;
                    bestP = pTop;
                    centerPoint = top;
                }
                // 检测三角形顶点到线段 [base, top] 的距离,防止腰部穿透细线
                for (let i = 0; i < 3; i++) {
                    const pOnAxis = this._closestPtPointSegment(tri.v[i], base, top);
                    const dSq = this._lenSq(this._sub(tri.v[i], pOnAxis));
                    if (dSq < distSq) {
                        distSq = dSq;
                        bestP = tri.v[i];
                        centerPoint = pOnAxis;
                    }
                }

                if (distSq < r * r) {
                    const dist = Math.sqrt(distSq);
                    const depth = r - dist;
                    if (depth > maxDepth) {
                        maxDepth = depth;
                        result.hit = true;
                        result.depth = depth;
                        result.point = bestP;
                        // 推斥法线
                        const diff = this._sub(centerPoint, bestP);
                        result.normal = dist < 1e-5 ? tri.normal : this._normalize(diff);
                    }
                }
            }
            if (updateGlobal) this.lastResult = result; // 只有在 updateGlobal 为 true 时才更新全局记录
            return result;
        }

        // --------------点到三角形的最近点---------------

        checkCapsuleBlock(args) {
            // 传入 true，保证这个积木运行后，能通过“最后碰撞数据”拿到这里的法线
            const res = this._solveCapsuleCollision(Number(args.X), Number(args.Y), Number(args.Z), Number(args.R), Number(args.H), true);
            return res.hit;
        }

        stepPhysics(args) {
            let pos = [Number(args.X), Number(args.Y), Number(args.Z)];
            let vel = [Number(args.VX), Number(args.VY), Number(args.VZ)];
            const r = Number(args.R), h = Number(args.H), dt = Number(args.DT);
            let grounded = false;

            const MAX_SLIDES = 3;
            for (let i = 0; i < MAX_SLIDES; i++) {
                let move = this._scale(vel, dt);
                if (this._lenSq(move) < 0.00001) break;

                let target = this._add(pos, move);
                let col = this._solveCapsuleCollision(target[0], target[1], target[2], r, h);

                if (!col.hit) {
                    pos = target;
                    break;
                } else {
                    // 修正位置
                    const push = this._scale(col.normal, col.depth + 0.005);
                    pos = this._add(target, push);

                    // 修正速度
                    const vDotN = this._dot(vel, col.normal);
                    vel = this._sub(vel, this._scale(col.normal, vDotN));

                    if (col.normal[1] > 0.6) { // 35°
                        grounded = true;
                        if (vel[1] < 0) vel[1] = 0;
                    }
                }
            }
            // 落地防抖动
            // 向下探测一个微小的距离
            const probeDist = r * 0.2;
            // 这里传入 false，探测地面的过程不改写“最后碰撞法线”
            let groundCheck = this._solveCapsuleCollision(pos[0], pos[1] - probeDist, pos[2], r, h, false);

            if (groundCheck.hit && groundCheck.normal[1] > 0.6) {
                grounded = true;
                // 落地时如果还在向下运动，强制归零 VY
                if (vel[1] < 0) vel[1] = 0;
            } else {
                grounded = false;
            }

            this.physicsState = { x: pos[0], y: pos[1], z: pos[2], vx: vel[0], vy: vel[1], vz: vel[2], isGrounded: grounded };
        }
        getPhysicsProp(args) {
            const p = this.physicsState;
            switch (args.PROP) {
                case '新X': return p.x; case '新Y': return p.y; case '新Z': return p.z;
                case '新VX': return p.vx; case '新VY': return p.vy; case '新VZ': return p.vz;
                case '落地状态': return p.isGrounded;
            }
            return 0;
        }

        getCollisionInfo(args) {
            const r = this.lastResult;
            switch (args.INFO_TYPE) {
                case '法线X': return r.normal[0]; case '法线Y': return r.normal[1]; case '法线Z': return r.normal[2];
                case '穿透深度': return r.depth;
            }
            return 0;
        }

        // -----------构建BVH-----------
        buildFromList(args) {
            const data = this._getScratchList(args.LIST_NAME);
            if (!data || data.length < 9) return;
            const tris = [];
            for (let i = 0; i < data.length; i += 9) {
                const v = [[Number(data[i]), Number(data[i + 1]), Number(data[i + 2])], [Number(data[i + 3]), Number(data[i + 4]), Number(data[i + 5])], [Number(data[i + 6]), Number(data[i + 7]), Number(data[i + 8])]];
                const min = [Math.min(v[0][0], v[1][0], v[2][0]), Math.min(v[0][1], v[1][1], v[2][1]), Math.min(v[0][2], v[1][2], v[2][2])];
                const max = [Math.max(v[0][0], v[1][0], v[2][0]), Math.max(v[0][1], v[1][1], v[2][1]), Math.max(v[0][2], v[1][2], v[2][2])];
                const cen = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
                const n = this._normalize(this._cross(this._sub(v[1], v[0]), this._sub(v[2], v[0])));
                tris.push({ v, min, max, centroid: cen, normal: n });
            }
            this.debugInfo.totalTris = tris.length;
            this.bvh = this._recursiveBuild(tris, 4);
        }

        _recursiveBuild(tris, limit) {
            const node = { aabb: this._computeBounds(tris), left: null, right: null, tris: null };
            if (tris.length <= limit) { node.tris = tris; return node; }
            const size = this._sub(node.aabb.max, node.aabb.min);
            let axis = size[0] > size[1] ? (size[0] > size[2] ? 0 : 2) : (size[1] > size[2] ? 1 : 2);
            tris.sort((a, b) => a.centroid[axis] - b.centroid[axis]);
            const mid = Math.floor(tris.length / 2);
            node.left = this._recursiveBuild(tris.slice(0, mid), limit);
            node.right = this._recursiveBuild(tris.slice(mid), limit);
            return node;
        }

        _computeBounds(tris) {
            const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
            for (const t of tris) {
                for (let i = 0; i < 3; i++) {
                    min[i] = Math.min(min[i], t.min[i]);
                    max[i] = Math.max(max[i], t.max[i]);
                }
            }
            return { min, max };
        }

        _query(node, box, out) {
            if (node.aabb.min[0] > box.max[0] || node.aabb.max[0] < box.min[0] ||
                node.aabb.min[1] > box.max[1] || node.aabb.max[1] < box.min[1] ||
                node.aabb.min[2] > box.max[2] || node.aabb.max[2] < box.min[2]) return;
            if (node.tris) { for (const t of node.tris) out.push(t); }
            else { this._query(node.left, box, out); this._query(node.right, box, out); }
        }

        _getScratchList(name) {
            const rt = this.runtime || runtime;
            if (!rt) return null;
            for (const t of rt.targets) {
                for (const id in t.variables) {
                    const v = t.variables[id];
                    if (v.type === 'list' && v.name === name) return v.value;
                }
            }
            return null;
        }

        _getAllLists() {
            const rt = this.runtime || runtime;
            const names = [];
            if (rt) {
                for (const t of rt.targets) {
                    for (const id in t.variables) {
                        if (t.variables[id].type === 'list') names.push(t.variables[id].name);
                    }
                }
            }
            return names.length > 0 ? names : [' '];
        }

        // --------------DeBug--------------
    
        getDebug() {
            const res = this.lastResult;
            const phy = this.physicsState;
            const debugObj = {
                // BVH
                bvh: {
                    isBuilt: !!this.bvh,
                    totalTriangles: this.debugInfo.totalTris,
                    buildTimeMs: this.debugInfo.buildTime
                },
                // 最近一次探测结果，checkCapsule 或 stepPhysics 触发
                collision: {
                    hit: res.hit,
                    depth: Number(res.depth.toFixed(4)),
                    normal: res.normal.map(n => Number(n.toFixed(3))),
                    point: res.point.map(p => Number(p.toFixed(2)))
                },
                // 物理引擎当前状态
                physics: {
                    pos: [Number(phy.x.toFixed(2)), Number(phy.y.toFixed(2)), Number(phy.z.toFixed(2))],
                    vel: [Number(phy.vx.toFixed(2)), Number(phy.vy.toFixed(2)), Number(phy.vz.toFixed(2))],
                    isGrounded: phy.isGrounded
                },
                // 内存占用
                timestamp: Date.now()
            };

            return JSON.stringify(debugObj);
        }
    }

    Scratch.extensions.register(new BVHCollisionExtension());
})(Scratch);