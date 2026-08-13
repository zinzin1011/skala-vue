import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages는 https://계정명.github.io/저장소이름/ 처럼 하위 경로로 서비스된다.
  // 이 값을 저장소 이름과 맞춰두지 않으면 배포 후 /assets/... 를 찾다가 404가 나면서
  // 흰 화면만 뜬다. (개발 서버 주소도 http://localhost:5173/skala-vue/ 로 바뀐다)
  base: '/skala-vue/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
