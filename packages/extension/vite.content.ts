import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false, 
    outDir: 'dist',
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'MiniAptyContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
