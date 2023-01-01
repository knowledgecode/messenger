import terser from '@rollup/plugin-terser';

export default [
    {
        input: 'src/index.js',
        output: [
            { file: 'dist/esm/messenger.js', format: 'es' },
            { file: 'dist/esm/messenger.mjs', format: 'es' },
            { file: 'dist/umd/messenger.js', format: 'umd', name: 'messenger' }
        ],
        plugins: [terser()]
    }
];
