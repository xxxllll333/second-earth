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
  },
})
