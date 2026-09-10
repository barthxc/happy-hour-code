import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    // El dynamic import() en main.tsx (para atrapar errores de carga y
    // mostrarlos en pantalla) no debe partir el bundle en varios chunks:
    // react-gbajs es un bundle estilo webpack cuyos "módulos" internos se
    // comunican vía globales compartidas y esperan ejecutarse como una
    // sola unidad, en orden. Si Rollup lo parte en chunks separados, ese
    // orden se rompe (ej. "ARMCoreArm is not defined").
    rollupOptions: {
      output: { codeSplitting: false },
    },
  },
  base: "./",
});
