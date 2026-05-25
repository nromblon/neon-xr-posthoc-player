const internationalization = {
  locales: ['en', 'ja'],
  requiredLocales: ['en', 'ja'],
  strictMode: 'inclusive',
  defaultLocale: 'en',
}
const routing = {
  mode: 'prefix-no-default',
  storage: {
    cookies: [
      {
        name: 'INTLAYER_LOCALE',
        attributes: {},
      },
    ],
    headers: [
      {
        name: 'x-intlayer-locale',
      },
    ],
  },
  basePath: '',
}
const editor = {
  editorURL: 'http://localhost:8000',
  cmsURL: 'https://app.intlayer.org',
  backendURL: 'https://back.intlayer.org',
  port: 8000,
  enabled: false,
  dictionaryPriorityStrategy: 'local_first',
  liveSync: false,
  liveSyncPort: 4000,
  liveSyncURL: 'http://localhost:4000',
}
const log = {
  mode: 'default',
  prefix: '\u001b[38;5;239m[intlayer] \u001b[0m',
}
const system = {
  baseDir: 'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player',
  moduleAugmentationDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\types',
  unmergedDictionariesDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\unmerged_dictionary',
  remoteDictionariesDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\remote_dictionary',
  dictionariesDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\dictionary',
  dynamicDictionariesDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\dynamic_dictionary',
  fetchDictionariesDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\fetch_dictionary',
  typesDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\types',
  mainDir: 'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\main',
  configDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\config',
  cacheDir:
    'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\cache',
  tempDir: 'E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player\\.intlayer\\tmp',
}
const content = {
  fileExtensions: [
    '.content.ts',
    '.content.js',
    '.content.cjs',
    '.content.mjs',
    '.content.json',
    '.content.json5',
    '.content.jsonc',
    '.content.tsx',
    '.content.jsx',
    '.content.md',
    '.content.mdx',
    '.content.yaml',
    '.content.yml',
  ],
  contentDir: ['E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player'],
  codeDir: ['E:\\NeilRomblon\\Projects\\neon-xr-posthoc-player'],
  excludedPath: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.intlayer/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.expo/**',
    '**/.vercel/**',
    '**/.turbo/**',
    '**/.tanstack/**',
  ],
  watch: true,
}
const ai = {}
const dictionary = {
  fill: true,
  contentAutoTransformation: false,
  location: 'local',
  importMode: 'static',
}
const build = {
  mode: 'auto',
  minify: false,
  purge: false,
  traversePattern: [
    '**/*.{tsx,ts,js,mjs,cjs,jsx,vue,svelte,astro}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.intlayer/**',
    '!**/.next/**',
    '!**/.nuxt/**',
    '!**/.expo/**',
    '!**/.vercel/**',
    '!**/.turbo/**',
    '!**/.tanstack/**',
    '!**/*.config.*',
    '!**/*.test.*',
    '!**/*.spec.*',
    '!**/*.stories.*',
    '!**/*.d.ts',
    '!**/*.d.ts.map',
    '!**/*.map',
  ],
  outputFormat: ['esm', 'cjs'],
  cache: true,
  checkTypes: false,
}
const compiler = {
  enabled: true,
  dictionaryKeyPrefix: '',
  noMetadata: false,
  saveComponents: false,
}
const configuration = {
  internationalization,
  routing,
  editor,
  log,
  system,
  content,
  ai,
  dictionary,
  build,
  compiler,
}

export {
  internationalization,
  routing,
  editor,
  log,
  system,
  content,
  ai,
  dictionary,
  build,
  compiler,
  configuration,
}
export default configuration
