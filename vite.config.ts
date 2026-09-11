import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 源码根目录。
 * 注意：URL.pathname 会保留百分号编码（项目路径含中文时会被编码成 %XX），
 * 必须 decodeURIComponent 还原，否则 @ 别名会指向一个不存在的目录。
 */
const srcDir = decodeURIComponent(new URL('./src', import.meta.url).pathname)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
