// Local ESLint rules enforcing repo conventions from docs/07-testing-tdd.md
// and docs/08-coding-standards.md that no published plugin covers.

/** @type {import("eslint").Rule.RuleModule} */
const indexReexportOnly = {
  meta: {
    type: "problem",
    docs: {
      description: "index.ts files may only re-export (docs/07 coverage policy).",
    },
    schema: [],
    messages: {
      badStatement:
        'index.ts may only contain `export { x } from "./y"`, `export * from "./y"`, or an empty `export {}` module marker; found `{{ type }}`.',
    },
  },
  create(context) {
    const filename = context.filename;
    if (!/(^|[/\\])index\.ts$/.test(filename)) {
      return {};
    }
    return {
      Program(node) {
        for (const statement of node.body) {
          if (statement.type === "ExportAllDeclaration") {
            continue;
          }
          if (statement.type === "ExportNamedDeclaration" && statement.declaration == null) {
            continue;
          }
          context.report({
            node: statement,
            messageId: "badStatement",
            data: { type: statement.type },
          });
        }
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const typesDeclareOnly = {
  meta: {
    type: "problem",
    docs: {
      description: "types.ts files may only declare types (docs/07 coverage policy).",
    },
    schema: [],
    messages: {
      badStatement:
        "types.ts may only declare `interface`/`type` (or `import type`); found `{{ type }}`.",
      badImport: "types.ts may only use `import type`, not a value import.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!/(^|[/\\])types\.ts$/.test(filename)) {
      return {};
    }
    const allowedDeclarations = new Set(["TSInterfaceDeclaration", "TSTypeAliasDeclaration"]);
    return {
      Program(node) {
        for (const statement of node.body) {
          if (statement.type === "ImportDeclaration") {
            if (statement.importKind !== "type") {
              context.report({ node: statement, messageId: "badImport" });
            }
            continue;
          }
          if (statement.type === "ExportAllDeclaration") {
            continue;
          }
          if (statement.type === "ExportNamedDeclaration") {
            if (
              statement.declaration == null ||
              allowedDeclarations.has(statement.declaration.type)
            ) {
              continue;
            }
            context.report({
              node: statement,
              messageId: "badStatement",
              data: { type: statement.declaration.type },
            });
            continue;
          }
          if (allowedDeclarations.has(statement.type)) {
            continue;
          }
          context.report({
            node: statement,
            messageId: "badStatement",
            data: { type: statement.type },
          });
        }
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const coverageIgnoreReason = {
  meta: {
    type: "problem",
    docs: {
      description: "`v8 ignore` comments must carry a same-line coverage-ignore reason (docs/07).",
    },
    schema: [],
    messages: {
      missingReason:
        "A `v8 ignore` comment must be paired with a same-line `// coverage-ignore: <reason, PR link>` comment.",
    },
  },
  create(context) {
    return {
      Program() {
        const comments = context.sourceCode.getAllComments();
        const byLine = new Map();
        for (const comment of comments) {
          const line = comment.loc.start.line;
          const existing = byLine.get(line);
          if (existing) {
            existing.push(comment);
          } else {
            byLine.set(line, [comment]);
          }
        }
        for (const comment of comments) {
          if (!/\bv8 ignore\b/.test(comment.value)) {
            continue;
          }
          const sameLine = byLine.get(comment.loc.start.line) ?? [];
          const hasReason = sameLine.some((candidate) =>
            /coverage-ignore:\s*\S+/.test(candidate.value),
          );
          if (!hasReason) {
            context.report({ loc: comment.loc, messageId: "missingReason" });
          }
        }
      },
    };
  },
};

export const localRules = {
  rules: {
    "index-reexport-only": indexReexportOnly,
    "types-declare-only": typesDeclareOnly,
    "coverage-ignore-reason": coverageIgnoreReason,
  },
};
