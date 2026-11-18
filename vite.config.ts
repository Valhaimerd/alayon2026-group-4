import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [laravel({ input: ["resources/js/app.tsx"], refresh: ["resources/views/**", "routes/**", "app/Http/**"] }), react()],
});
