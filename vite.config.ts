import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 避免为配置文件引入 @types/node */
declare const process: { env: Record<string, string | undefined> }

/**
 * 源码根目录。
 * 注意：URL.pathname 会保留百分号编码（项目路径含中文时会被编码成 %XX），
 * 必须 decodeURIComponent 还原，否则 @ 别名会指向一个不存在的目录。
 */
const srcDir = decodeURIComponent(new URL('./src', import.meta.url).pathname)

/** 后端服务地址，可用环境变量 VITE_API_TARGET 覆盖 */
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:8218'

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
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
    },
  },
})
