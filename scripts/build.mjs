import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const clientDir = resolve(projectRoot, "dist/client");

await rm(clientDir, { recursive: true, force: true });
await mkdir(clientDir, { recursive: true });
await cp(resolve(projectRoot, "index.html"), resolve(clientDir, "index.html"));
await cp(resolve(projectRoot, "src"), resolve(clientDir, "src"), {
  recursive: true,
  force: true,
});

console.log("Built prototype to dist/client");
