import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 8000,
    cors: true
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Vapor3D',
      fileName: 'index',
      formats: ['iife'] // 使用 iife 格式，彻底消除 import 报错
    },
    outDir: 'dist'
  }
});