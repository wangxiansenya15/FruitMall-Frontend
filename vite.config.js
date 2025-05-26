import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',      // 目标服务器地址
        changeOrigin: true,                   // 允许跨域
        rewrite: (path) => path.replace(/^\/api/, '')    // 移除请求路径中的/api前缀 重写路径
      }
    }
  }
})
