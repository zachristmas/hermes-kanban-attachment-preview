import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [join(root, "src", "index.js")],
  bundle: true, format: "iife", minify: false, target: "es2020", legalComments: "none",
  outfile: join(root, "dashboard", "dist", "index.js"),
  banner: { js: "/* kanban-attachment-preview (MIT). Bundles fflate (MIT) for .docx unzip. Source: src/ */" },
});
console.log("built");
