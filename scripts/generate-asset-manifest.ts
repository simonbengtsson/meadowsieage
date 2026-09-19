import { readdir, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const assetsRoot = resolve(projectRoot, "public/assets");
const outputPath = resolve(projectRoot, "src/game/assetManifest.ts");

async function collectPngFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectPngFiles(path)));
    } else if (entry.name.endsWith(".png")) {
      files.push(path);
    }
  }

  return files;
}

const files = (await collectPngFiles(assetsRoot)).sort();
const assets = files.map((file) => {
  const relativePath = relative(assetsRoot, file).split(sep).join("/");
  const segments = relativePath.split("/");
  const filename = segments.at(-1) ?? relativePath;

  return {
    path: `/assets/${relativePath}`,
    category: segments[0],
    group: segments.slice(1, -1).join("/"),
    name: filename.replace(/\.png$/, ""),
  };
});

const source = `export type AssetEntry = {
  path: string;
  category: string;
  group: string;
  name: string;
};

export const ASSET_MANIFEST = ${JSON.stringify(assets, null, 2)} as const satisfies readonly AssetEntry[];
`;

await writeFile(outputPath, source);
console.log(`Generated ${assets.length} asset entries.`);
