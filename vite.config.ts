import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { readFileSync } from 'fs';

// package.jsonを読み込んでバージョンを取得
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;

const basePath = process.env.BASE_PATH

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: basePath ? basePath : "",
  // アプリケーションコード内で参照できるように環境変数を定義
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  }
});