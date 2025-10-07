import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cấu hình Vite với plugin React
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // hoặc sử dụng 'localhost'
    port: 5173
  }
});