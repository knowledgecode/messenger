import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: 'messenger.js',
                format: 'umd',
                name: 'messenger',
                esModule: false
            },
            {
                file: 'messenger.min.js',
                format: 'umd',
                name: 'messenger',
                esModule: false,
                plugins: [terser()]
            },
            {
                file: 'esm/messenger.es.js',
                format: 'es'
            },
            {
                file: 'esm/messenger.es.min.js',
                format: 'es',
                plugins: [terser()]
            }
        ]
    }
];
