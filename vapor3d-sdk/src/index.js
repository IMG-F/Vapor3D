import { CoreBlocks, CoreMenus } from './blocks/Core_b.js';
import { LoaderBlocks, LoaderMenus } from './blocks/Loader_b.js';
import {  MathBlocks } from './blocks/Math_b.js';
import { Vapor3DCore } from './handlers/Core_h.js';
import { Vapor3DLoader } from './handlers/Loader_h.js';
import { Vapor3DMath } from './handlers/Math_h.js';

(function (Scratch) {
    "use strict";
    if (!Scratch.extensions.unsandboxed) throw new Error("Vapor3D must run unsandboxed");

    const vm = Scratch.vm;

    class Vapor3DExtension {
        constructor() {
            this.coreHandlers = new Vapor3DCore(vm);
            this.loaderHandlers = new Vapor3DLoader(this.coreHandlers);
            this.mathHandlers = new Vapor3DMath();

            const bindMethods = (instance) => {
                const proto = Object.getPrototypeOf(instance);
                Object.getOwnPropertyNames(proto).forEach(method => {
                    if (method !== 'constructor') {
                        this[method] = instance[method].bind(instance);
                    }
                });
            };
            bindMethods(this.coreHandlers);
            bindMethods(this.loaderHandlers);
            bindMethods(this.mathHandlers);
        }

        tex_getCostumes() {
            if (!vm || !vm.editingTarget) return ["Null"];

            try {
                return vm.editingTarget.getCostumes().map(e => e.name);
            } catch (e) {
                return ["Loading"];
            }
        }

        

        getInfo() {
            return {
                id: 'vapor3D',
                name: 'Vapor 3D',
                color1: "#2f2f36",
                hideFromPalette: true,
                blocks: [
                    ...CoreBlocks,
                    "---",
                    ...MathBlocks,
                    "---",
                    ...LoaderBlocks
                ],
                menus: { ...CoreMenus, ...LoaderMenus }
            };
        }
    }

    const originalGetBlocksXML = vm.runtime.getBlocksXML;

    vm.runtime.getBlocksXML = function (target) {
        const res = originalGetBlocksXML.call(this, target);

        try {
            const ext = this._blockInfo.find(info => info.id === "vapor3D");
            if (!ext) return res;

            const allBlocks = ext.blocks;

            // 包映射
            const groupDefinitions = [
                { name: "Core", data: CoreBlocks, color: "#2f2f36" },
                { name: "Math", data: MathBlocks, color: "#2f2f36" },
                { name: "Loader", data: LoaderBlocks, color: "#2f2f36" }
            ];

            // 清空原有结果中可能存在的重复项（可选，取决于你是否设置了 hideFromPalette）
            // 直接把子类别 push 进 res
            groupDefinitions.forEach(group => {
                const groupXml = group.data.map(def => {
                    if (def === "---") return '<sep gap="36"/>';
                    if (typeof def === 'object' && def.blockType === 'label') {
                        return `<label text="${def.text}"/>`;
                    }
                    if (def.opcode) {
                        const b = allBlocks.find(ab => ab.info.opcode === def.opcode);
                        return b ? b.xml : '';
                    }
                    return '';
                }).join('');

                if (groupXml) {
                    res.push({
                        id: `v3d_cat_${group.name.toLowerCase()}`,
                        xml: `<category name="${group.name}" id="v3d_cat_${group.name.toLowerCase()}" colour="${group.color}" secondaryColour="${group.color}">
                                ${groupXml}
                              </category>`
                    });
                }
            });
        } catch (e) {
            console.error("[V3D] Category Injection Error:", e);
        }

        // 5. 必须返回 res，否则侧边栏就是空的！
        return res;
    };

    // --- 最后注册扩展 ---
    Scratch.extensions.register(new Vapor3DExtension());
})(Scratch);