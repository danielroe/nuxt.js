// @ts-check

import path from 'path'
import { readJSONSync, existsSync } from 'fs-extra'
import jsonPlugin from '@rollup/plugin-json'
import commonjsPlugin from '@rollup/plugin-commonjs'
import replacePlugin from '@rollup/plugin-replace'
import aliasPlugin from '@rollup/plugin-alias'
import nodeResolvePlugin from '@rollup/plugin-node-resolve'
import licensePlugin from 'rollup-plugin-license'
import typescriptPlugin from 'rollup-plugin-typescript2'
import defaultsDeep from 'lodash/defaultsDeep'

import { builtins } from './builtins'

/**
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('@rollup/plugin-alias').RollupAliasOptions} RollupAliasOptions
 * @typedef {import('@rollup/plugin-replace').Replacement} Replacement
 * @typedef {import('@rollup/plugin-node-resolve').RollupNodeResolveOptions} RollupNodeResolveOptions
 * @typedef {{
     rootDir?: string
     replace?: Record<string, Replacement>
     alias?: RollupAliasOptions
     externals?: (string | RegExp)[]
     resolve?: RollupNodeResolveOptions
     input?: string
   }} NuxtRollupOptions
 */

/**
 * @param {RollupOptions & NuxtRollupOptions} rollupOptions
 * @param {Record<string, any>} pkg
 * @returns {Omit<RollupOptions, 'output'> & { output: import('rollup').OutputOptions }}
 */
export default function rollupConfig ({
  rootDir = process.cwd(),
  plugins = [],
  input = 'src/index.js',
  replace = {},
  alias = {},
  externals = [],
  resolve = {
    resolveOnly: [
      /lodash/,
      /^((?!node_modules).)*$/
    ]
  },
  ...options
}, pkg) {
  if (!pkg) {
    pkg = readJSONSync(path.resolve(rootDir, 'package.json'))
  }

  const name = path.basename(pkg.name.replace('-edge', ''))

  return defaultsDeep({}, options, {
    input: path.resolve(rootDir, input),
    output: {
      dir: path.resolve(rootDir, 'dist'),
      entryFileNames: `${name}.js`,
      chunkFileNames: `${name}-[name].js`,
      format: 'cjs',
      preferConst: true
    },
    external: [
      // Dependencies that will be installed alongise with the nuxt package
      ...Object.keys(pkg.dependencies || {}),
      // Builtin node modules
      ...builtins,
      // Explicit externals
      ...externals
    ],
    plugins: [
      aliasPlugin(alias),
      replacePlugin({
        exclude: 'node_modules/**',
        delimiters: ['', ''],
        values: {
          __NODE_ENV__: process.env.NODE_ENV,
          ...replace
        }
      }),
      nodeResolvePlugin(resolve),
      commonjsPlugin({ include: /node_modules/ }),
      jsonPlugin(),
      licensePlugin({
        banner: [
          '/*!',
          ` * ${pkg.name} v${pkg.version} (c) 2016-${new Date().getFullYear()}`,
          `${(pkg.contributors || []).map(c => ` * - ${c.name}`).join('\n')}`,
          ' * - All the amazing contributors',
          ' * Released under the MIT License.',
          ' * Website: https://nuxtjs.org',
          '*/'
        ].join('\n')
      }),
      typescriptPlugin({
        tsconfig:
          input.includes('.ts') &&
          existsSync(path.resolve(rootDir, 'tsconfig.json'))
            ? path.resolve(rootDir, 'tsconfig.json')
            : undefined,
        tsconfigDefaults: {
          compilerOptions: {
            target: 'esnext',
            moduleResolution: 'node',
            rootDir: 'src',
            declaration: true,
            outDir: 'dist',
            lib: ['esnext', 'esnext.asynciterable', 'dom']
          },
          exclude: ['test', 'dist', 'node_modules', 'package.js']
        }
      })
    ].concat(plugins)
  })
}
