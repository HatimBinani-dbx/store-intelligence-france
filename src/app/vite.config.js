import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Debug: Log environment variables during build
  console.log('🔧 Vite Environment Variables:', {
    mode,
    REACT_APP_DATABRICKS_TOKEN: env.REACT_APP_DATABRICKS_TOKEN ? `${env.REACT_APP_DATABRICKS_TOKEN.substring(0, 10)}...` : 'NOT_FOUND',
    REACT_APP_AGENT_ENDPOINT: env.REACT_APP_AGENT_ENDPOINT ? 'FOUND' : 'NOT_FOUND'
  })
  
  return {
    plugins: [react({
      jsxRuntime: 'automatic'
    })],
    define: {
      // Expose environment variables to the client
      'process.env.REACT_APP_DATABRICKS_TOKEN': JSON.stringify(env.REACT_APP_DATABRICKS_TOKEN),
      'process.env.REACT_APP_AGENT_ENDPOINT': JSON.stringify(env.REACT_APP_AGENT_ENDPOINT),
      'process.env.AGENT_ENDPOINT_URL': JSON.stringify(env.AGENT_ENDPOINT_URL),
      'process.env.CLIENT_ID': JSON.stringify(env.CLIENT_ID),
      'process.env.CLIENT_SECRET': JSON.stringify(env.CLIENT_SECRET),
    },
    build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
      },
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
    esbuild: {
      jsx: 'automatic',
    },
  }
})