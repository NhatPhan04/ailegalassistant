import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Thêm đoạn proxy này vào
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Trỏ về Backend Python
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '') // Xóa chữ /api trước khi gửi sang Python
      }
    }
  }
})