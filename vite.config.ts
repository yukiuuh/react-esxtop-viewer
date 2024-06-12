import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const basePath = process.env.BASE_PATH
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: basePath ? basePath : ""
});
