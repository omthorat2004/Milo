// Bundles the popup and writes dist/. The API and app origins are baked in at build time, read
// from .env.local / .env (see .env.example) or the shell:
//   MILO_API_URL=https://api.example.com MILO_APP_URL=https://app.example.com npm run build
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Precedence: shell > .env.local > .env. loadEnvFile never overrides a variable that is already
// set, so the highest-priority file is loaded first.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const apiUrl = (process.env.MILO_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const appUrl = (process.env.MILO_APP_URL ?? "http://localhost:3001").replace(/\/+$/, "");

for (const [name, value] of [
  ["MILO_API_URL", apiUrl],
  ["MILO_APP_URL", appUrl],
]) {
  const url = new URL(value); // throws on garbage
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(`${name} must be https (or localhost for development), got ${value}`);
  }
}

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/popup.ts"],
  bundle: true,
  format: "iife",
  target: "chrome120",
  outfile: "dist/popup.js",
  define: {
    "process.env.MILO_API_URL": JSON.stringify(apiUrl),
    "process.env.MILO_APP_URL": JSON.stringify(appUrl),
  },
});

await cp("src/popup.html", "dist/popup.html");
await cp("src/popup.css", "dist/popup.css");
await cp("icons", "dist/icons", { recursive: true });
// Fonts are bundled (not fetched from Google) so the popup works offline and sends no requests.
await mkdir("dist/fonts", { recursive: true });
const fonts = [
  ["@fontsource/inter", "inter-latin-400-normal.woff2"],
  ["@fontsource/inter", "inter-latin-500-normal.woff2"],
  ["@fontsource/instrument-serif", "instrument-serif-latin-400-normal.woff2"],
];
for (const [pkg, file] of fonts) {
  const path = fileURLToPath(import.meta.resolve(`${pkg}/files/${file}`));
  await cp(path, `dist/fonts/${file}`);
}

const manifest = {
  manifest_version: 3,
  name: "Milo",
  version: "0.1.0",
  description: "Create Milo tracking links for your resume from any page.",
  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
  action: {
    default_popup: "popup.html",
    default_title: "Milo",
    default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png" },
  },
  // storage: the token pair. activeTab: the current tab's URL/title, only after a click.
  // No tabs, history or all-urls access.
  permissions: ["storage", "activeTab"],
  host_permissions: [`${new URL(apiUrl).origin}/*`],
};
await writeFile("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built dist/ (api ${apiUrl}, app ${appUrl})`);
