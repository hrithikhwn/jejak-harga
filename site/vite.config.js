import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this project at /jejak-harga/ (the repo name). Without this,
  // the built page asks for /assets/... instead of /jejak-harga/assets/... and loads blank.
  base: "/jejak-harga/",
  plugins: [react()],
  test: {
    environment: "node", // the tests check data and maths, so no browser is needed
  },
});
