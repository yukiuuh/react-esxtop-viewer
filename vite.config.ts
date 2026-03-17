import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// package.jsonを読み込んでバージョンを取得
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const appVersion = packageJson.version;

const basePath = process.env.BASE_PATH;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: basePath ?? "",
  build: {
    cssMinify: false,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  // アプリケーションコード内で参照できるように環境変数を定義
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  lint: {
    ignorePatterns: ["dist/**", "src-tauri/gen/**"],
  },
});
