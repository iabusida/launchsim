import { builtinModules } from "node:module";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import { localRules } from "./eslint-rules/index.js";

// Every Node built-in, bare and "node:"-prefixed, for the packages/core I/O ban (docs/01, docs/08).
const nodeBuiltinSpecifiers = builtinModules
  .filter((name) => !name.startsWith("_"))
  .flatMap((name) => [name, `node:${name}`]);

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.stryker-tmp/**",
      "**/reports/mutation/**",
      "docs/api/**",
      "**/launchsim-report/**",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,

  // Type-aware TypeScript rules for package sources (each package's tsconfig
  // covers exactly its own src/, so the projectService can type-check them).
  {
    files: ["packages/*/src/**/*.ts"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // Per-package tool configs (vitest.config.ts, ...) aren't part of any
  // package's tsconfig program, so they get non-type-aware TS linting only.
  {
    files: ["packages/*/*.config.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },

  // Repo conventions that apply to package sources only (not their tool configs).
  {
    files: ["packages/*/src/**/*.ts"],
    plugins: { local: localRules },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Named exports only; scenario files are the one exception (docs/08).",
        },
      ],
      "local/index-reexport-only": "error",
      "local/types-declare-only": "error",
      "local/coverage-ignore-reason": "error",
    },
  },

  // packages/core is pure: no Math.random/Date.now, no Node built-in imports (docs/01, docs/08).
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "core must be deterministic: use the injected Rng instead of Math.random (docs/08).",
        },
        {
          object: "Date",
          property: "now",
          message:
            "core must be deterministic: use the injected Clock instead of Date.now (docs/08).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: nodeBuiltinSpecifiers.map((name) => ({
            name,
            message:
              "packages/core has zero I/O; Node built-ins belong in cli/blink/adapters (docs/01).",
          })),
        },
      ],
    },
  },

  // Plain-JS tooling configs: base rules only, Node globals, no type-aware project needed.
  {
    files: ["**/*.config.{js,mjs,cjs}", "eslint-rules/**/*.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },

  // Scenario files default-export a scenario (docs/08 exception). Not part
  // of any package's tsconfig program, so non-type-aware TS linting only
  // (like packages/*/*.config.ts above).
  {
    files: ["scenarios/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-restricted-syntax": "off" },
  },
);
