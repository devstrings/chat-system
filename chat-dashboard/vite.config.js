import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    
 server: {
  port: 5173,
  host: true,  
  proxy: {
    '/api': {
      target: env.VITE_API_URL || 'http://backend:5000',  // ← localhost → backend
      changeOrigin: true,
      secure: false,
    },
    '/socket.io': {
      target: env.VITE_API_URL || 'http://backend:5000',  // ← localhost → backend
      changeOrigin: true,
      ws: true,
    }
  }
},
    
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            redux: ['@reduxjs/toolkit', 'react-redux'],
            socket: ['socket.io-client'],
          }
        }
      }
    },
    
    define: {
      'process.env': {}
    },
    
    optimizeDeps: {
      include: ['react', 'react-dom', 'socket.io-client']
    }
  };
});