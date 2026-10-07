// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * The zone rule (docs/automation-architecture.md §3, §6 layer 1).
 *
 * Code deployed to the PUBLIC Trigger.dev project may not import anything that
 * talks to the PHI zone. Exported so test/zone-rule.test.ts can assert the
 * exact same list the linter enforces.
 */
export const PHI_ZONE_IMPORT_PATTERNS = [
  "**/adapters/llm/anthropic-phi",
  "**/adapters/llm/anthropic-phi.js",
  // Each directory twice: the bare directory (index resolution) and anything under it.
  "**/adapters/messaging",
  "**/adapters/messaging/**",
  "**/adapters/voice",
  "**/adapters/voice/**",
  "**/adapters/scheduling",
  "**/adapters/scheduling/**",
  "**/lib/db-phi",
  "**/lib/db-phi.js",
  // Any directory named `phi` is PHI-zone code by definition (src/trigger/phi/…).
  // Matching on the directory name catches relative imports like "../../phi/x.js",
  // which never contain "trigger/phi". `lib/phi.js` is a file and stays importable.
  "**/phi",
  "**/phi/**",
];

export const PUBLIC_ZONE_FILES = ["src/trigger/marketing/**/*.ts"];

/** `fromPublicSource` brands runtime text as PublicText; only the public-source adapters may call it. */
export const PUBLIC_SOURCE_ADAPTERS = ["src/adapters/google/**/*.ts"];
const FROM_PUBLIC_SOURCE = {
  group: ["**/lib/phi", "**/lib/phi.js"],
  importNames: ["fromPublicSource"],
  message:
    "fromPublicSource is only for the public-source adapters (src/adapters/google). A new caller is a new public source: argue it in review and add it to PUBLIC_SOURCE_ADAPTERS.",
};

export default tseslint.config(
  { ignores: ["node_modules/**", ".trigger/**", "dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: PUBLIC_SOURCE_ADAPTERS,
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", { patterns: [FROM_PUBLIC_SOURCE] }],
    },
  },
  {
    files: PUBLIC_ZONE_FILES,
    // The zone rule cannot be switched off from inside a public-zone file.
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
    rules: {
      // Specifiers the import rule cannot see. Imports in the public zone are static.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression",
          message: "Dynamic import() is not allowed in the public zone: the zone rule cannot check it.",
        },
        {
          selector: "CallExpression[callee.name='require']",
          message: "require() is not allowed in the public zone: the zone rule cannot check it.",
        },
      ],
      // The TypeScript variant also catches `import type`, which the core rule misses.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          // Every marketing task goes through src/lib/task.ts, which keeps raw
          // vendor errors from reaching the run's recorded span.
          paths: ["@trigger.dev/sdk", "@trigger.dev/sdk/v3"].map((name) => ({
            name,
            importNames: ["task", "schemaTask", "schedules"],
            message: "Define marketing tasks with marketingSchedule from src/lib/task.ts, which strips vendor error text.",
          })),
          patterns: [
            FROM_PUBLIC_SOURCE,
            {
              group: PHI_ZONE_IMPORT_PATTERNS,
              message:
                "PHI-zone module imported from the public zone. Marketing tasks must never reach PHI adapters (docs/automation-architecture.md §6).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
);
