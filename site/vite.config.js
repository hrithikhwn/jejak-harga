import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Content Security Policy: the browser may only load scripts, styles, fonts and data
// from this site's own address, so even if something unexpected got into the page,
// it couldn't pull in code from elsewhere or send anything away.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // the chart sets inline style attributes
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

// GitHub Pages can't send security headers, so the policy goes in a <meta> tag at the
// top of the built page. Only in the build: the dev server needs inline scripts for
// hot reload, which this policy would block.
function contentSecurityPolicy() {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  // GitHub Pages serves this project at /jejak-harga/ (the repo name). Without this,
  // the built page asks for /assets/... instead of /jejak-harga/assets/... and loads blank.
  base: "/jejak-harga/",
  plugins: [react(), contentSecurityPolicy()],
  test: {
    environment: "node", // the tests check data and maths, so no browser is needed
  },
});
