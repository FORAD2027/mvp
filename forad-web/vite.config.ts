import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:preview` inlines everything into one HTML file (used for the shareable preview).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'singlefile' ? [react(), viteSingleFile()] : [react()],
  build: { outDir: mode === 'singlefile' ? 'dist-preview' : 'dist' },
}));
