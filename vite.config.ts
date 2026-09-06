import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Windows 下文件监视器对纹理资产报 EBUSY 会拖垮 dev server，资产目录不参与热更新
    watch: {
      ignored: ['**/src/assets/**'],
    },
    // 开发代理：前端请求同源相对路径 /api → 转发到本机后端，彻底规避 CORS（与 dev 端口无关）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
