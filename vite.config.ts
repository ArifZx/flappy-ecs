import { defineConfig } from 'vite';

const sharedArrayBufferHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export default defineConfig({
  server: {
    headers: sharedArrayBufferHeaders,
  },
  preview: {
    headers: sharedArrayBufferHeaders,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      mangle: true,
      keep_fnames: false,
      keep_classnames: false,
      toplevel: true,
    }
  }
});