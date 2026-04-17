//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: ['.output/**', 'node_modules/**', 'eslint.config.js', 'prettier.config.js'],
  },
  ...tanstackConfig,
]
