import esbuild from 'rollup-plugin-esbuild';
import license from 'rollup-plugin-license';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';

export default () => {
  return [
    {
      input: 'src/index.ts',
      output: [
        { dir: 'dist', format: 'es' },
        { dir: 'dist', format: 'umd', name: 'messenger', entryFileNames: 'messenger.js' }
      ],
      plugins: [
        esbuild({ minify: false, target: 'es2015' }),
        license({
          banner: '@license\nCopyright 2019 KNOWLEDGECODE\nSPDX-License-Identifier: MIT\n'
        }),
        terser()
      ]
    },
    {
      input: 'src/index.ts',
      output: [
        { dir: 'dist' }
      ],
      plugins: [
        dts()
      ]
    }
  ];
};
