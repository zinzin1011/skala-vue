import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx}'],
  },

  // .vite/**: Vite 개발 서버가 의존성을 사전 번들링해두는 캐시 폴더. 소스코드가 아니라
  // node_modules를 그대로 이어붙인 산출물이라 여기 eqeqeq 등을 적용하면 수백 개의 가짜
  // 에러가 쏟아진다 (실제로 npx eslint . 전체 실행 시 이 폴더 때문에 228개 에러가 나온 적 있음).
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/.vite/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  // Code Challenge - ESLint (10. Vite Build & Deployment):
  // 느슨한 비교(==, !=) 대신 항상 엄격 비교(===, !==)를 강제하고, 개발 편의를 위해
  // console.log 사용은 허용한다(과제 곳곳에서 디버깅 로그를 의도적으로 쓰고 있음).
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },

  skipFormatting,
])
