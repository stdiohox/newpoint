/**
 * The transitive half of the zone rule (docs/automation-architecture.md §6 layer 1).
 *
 * ESLint checks each file's own imports. Trigger.dev bundles everything a task
 * reaches, so a marketing task that imports a shared module which imports a
 * PHI adapter would ship that adapter in the public deploy and still pass lint.
 * This walks the real module graph, resolved by TypeScript, from every file
 * under src/trigger/marketing.
 */
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/** Same modules as PHI_ZONE_IMPORT_PATTERNS in eslint.config.mjs, as resolved paths under src/. */
const PHI_ZONE_MODULE =
  /^(adapters\/llm\/anthropic-phi\.ts|adapters\/(messaging|voice|scheduling)\/.*|lib\/db-phi\.ts|(.*\/)?phi\/.*)$/;

export function isPhiZoneModule(srcRelativePath: string): boolean {
  return PHI_ZONE_MODULE.test(srcRelativePath.split(sep).join("/"));
}

function tsFilesUnder(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsFilesUnder(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

const OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};

/** Every `entry → … → phi module` chain reachable from `<projectRoot>/src/trigger/marketing`. */
export function phiZoneChains(projectRoot: string): string[][] {
  const src = join(projectRoot, "src");
  const chains: string[][] = [];

  for (const entry of tsFilesUnder(join(src, "trigger", "marketing"))) {
    const seen = new Set<string>([entry]);
    const queue: string[][] = [[entry]];
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
      const file = path[path.length - 1];
      if (file === undefined) continue;
      const text = ts.sys.readFile(file) ?? "";
      for (const { fileName } of ts.preProcessFile(text, true, true).importedFiles) {
        const resolved = ts.resolveModuleName(fileName, file, OPTIONS, ts.sys).resolvedModule;
        if (!resolved || resolved.isExternalLibraryImport === true) continue;
        const target = resolved.resolvedFileName;
        if (seen.has(target)) continue;
        seen.add(target);
        const next = [...path, target];
        if (isPhiZoneModule(relative(src, target))) chains.push(next.map((p) => relative(projectRoot, p)));
        else queue.push(next);
      }
    }
  }
  return chains;
}
