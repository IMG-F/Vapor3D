export const LoaderMenus = {
    texTypeMenu: [
        { text: 'Albedo', value: 'albedoID' },
        { text: 'Normal', value: 'normalID' },
        { text: 'ORM', value: 'ormID' },
        { text: 'Emissive', value: 'emissiveID' }
    ],
    pbrParamMenu: [
        { text: 'Roughness', value: 'roughness' },
        { text: 'Metalness', value: 'metalness' },
        { text: 'BaseColor', value: 'baseColor' }
    ]
};

export const LoaderBlocks = [
    { opcode: 'isLoaderReady', blockType: 'Boolean', text: 'Vapor3DLoader ready?' },
    {
        opcode: 'loadModel', blockType: 'command', text: 'load model [NAME] from [DATA]',
        arguments: {
            DATA: { type: 'string', defaultValue: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/WaterBottle/glTF-Binary/WaterBottle.glb' },
            NAME: { type: 'string', defaultValue: 'sample' }
        }
    },
    { opcode: 'getLoadStatus', blockType: 'reporter', text: 'get load status' },
    {
        opcode: 'getMeshCount', blockType: 'reporter', text: 'get model [NAME] mesh count',
        arguments: { NAME: { type: 'string', defaultValue: 'sample' } }
    },
    {
        opcode: 'getMeshName', blockType: 'reporter', text: 'get model [NAME] mesh [IDX] name',
        arguments: { NAME: { type: 'string', defaultValue: 'sample' }, IDX: { type: 'number', defaultValue: 0 } }
    },
    {
        opcode: 'getVaoID',
        blockType: 'reporter',
        text: 'get model [NAME] mesh [IDX] prim [PRIM] VAO ID',
        arguments: {
            NAME: { type: 'string', defaultValue: 'sample' },
            IDX: { type: 'number', defaultValue: 0 },
            PRIM: { type: 'number', defaultValue: 0 }
        }
    },
    {
        opcode: 'getMeshTextureID', blockType: 'reporter', text: 'get model [NAME] mesh [IDX] [TYPE] texture ID',
        arguments: { NAME: { type: 'string', defaultValue: 'sample' }, IDX: { type: 'number', defaultValue: 0 }, TYPE: { type: 'string', menu: 'texTypeMenu', defaultValue: 'albedoID' } }
    },
    {
        opcode: 'getMeshPBRParam', blockType: 'reporter', text: 'get model [NAME] mesh [IDX] material [PARAM]',
        arguments: { NAME: { type: 'string', defaultValue: 'sample' }, IDX: { type: 'number', defaultValue: 0 }, PARAM: { type: 'string', menu: 'pbrParamMenu', defaultValue: 'roughness' } }
    }
];