import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      // React/ReactDOM/React-Router load from CDN (see index.html) instead of being
      // bundled — keeps our own deployed bundle small regardless of their size.
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
        },
        // Split react-router-dom (large) into its own chunk, separate from
        // app code — keeps every individual deployed file small and reliable
        // to transmit, rather than one large ~33KB entry bundle.
        manualChunks: {
          router: ['react-router-dom'],
        },
      },
    },
  },
});
