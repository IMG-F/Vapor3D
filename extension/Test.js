(function (Scratch) {
    'use strict';
    const vm = Scratch.vm;

    const Category = {
        A: 'A',
        B: 'B',
        C: 'C'
    };

    const definitions = [
        { opcode: 'opA', blockType: 'command', text: 'ABC', category: Category.A },
        { opcode: 'opB', blockType: 'command', text: 'ABC', category: Category.B },
        { opcode: 'opC', blockType: 'command', text: 'ABC', category: Category.C }
    ];

    definitions.forEach(block => {
        if (block.category) {
            block.hideFromPalette = true;
        }
    });

    class Extension {
        getInfo() {
            return {
                id: 'abc',
                name: 'Test',
                blocks: definitions
            };
        }
        opA() { console.log('A'); }
        opB() { console.log('B'); }
        opC() { console.log('C'); }
    }

    const gbx = vm.runtime.getBlocksXML;
    vm.runtime.getBlocksXML = function (target) {
        const res = gbx.call(this, target);
        try {
            const ext = this._blockInfo.find(info => info.id === "abc");
            if (ext) {
                const blocks = ext.blocks;
                for (let key in Category) {
                    const categoryName = Category[key];
                    const paletteBlocks = blocks.filter(b => b.info && b.info.category === categoryName);

                    if (paletteBlocks.length > 0) {
                        res.push({
                            id: categoryName,
                            xml: `<category name="${categoryName}" id="cat${categoryName}" colour="#FF4D6A" secondaryColour="#D6304D">
                                    ${paletteBlocks.map(b => b.xml).join('')}
                                  </category>`
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Category Injection Error:", e);
        }
        return res;
    };

    Scratch.extensions.register(new Extension());
})(Scratch);