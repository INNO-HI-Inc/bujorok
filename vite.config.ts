import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 하위 경로에서도 동작하도록 상대 경로 base 사용
export default defineConfig({
  base: './',
  plugins: [react()],
});
