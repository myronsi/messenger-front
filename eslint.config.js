import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Existing code uses `any` widely; surface it as a warning until it is typed.
      "@typescript-eslint/no-explicit-any": "warn",
      "max-lines": [
        "error",
        { max: 299, skipBlankLines: false, skipComments: false },
      ],
    },
  },
  // Feature-Sliced Design: enforce the layer hierarchy and slice public APIs.
  // app > pages > widgets > features > entities > shared (a layer may only import from layers below it).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.app.json" },
      },
      "boundaries/elements": [
        { type: "app", pattern: "src/app", partialMatch: false },
        { type: "pages", pattern: "src/pages/*", capture: ["slice"], partialMatch: false },
        { type: "widgets", pattern: "src/widgets/*", capture: ["slice"], partialMatch: false },
        { type: "features", pattern: "src/features/*", capture: ["slice"], partialMatch: false },
        { type: "entities", pattern: "src/entities/*", capture: ["slice"], partialMatch: false },
        { type: "shared", pattern: "src/shared", partialMatch: false },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            {
              from: { element: { type: "shared" } },
              disallow: { to: { element: { type: ["app", "pages", "widgets", "features", "entities"] } } },
              message: "shared must not depend on higher layers ({{to.element.types.[0]}}).",
            },
            {
              from: { element: { type: "entities" } },
              disallow: { to: { element: { type: ["app", "pages", "widgets", "features"] } } },
              message: "entities may only depend on entities and shared, not on {{to.element.types.[0]}}.",
            },
            {
              from: { element: { type: "features" } },
              disallow: { to: { element: { type: ["app", "pages", "widgets"] } } },
              message: "features may only depend on entities and shared, not on {{to.element.types.[0]}}.",
            },
            {
              from: { element: { type: "widgets" } },
              disallow: { to: { element: { type: ["app", "pages"] } } },
              message: "widgets may only depend on features, entities and shared, not on {{to.element.types.[0]}}.",
            },
            {
              from: { element: { type: "pages" } },
              disallow: { to: { element: { type: "app" } } },
              message: "pages must not depend on the app layer.",
            },
            // Slices of the same layer are isolated from each other (entities may reference one another through public APIs).
            ...["pages", "widgets", "features"].map((layer) => ({
              from: { element: { type: layer } },
              disallow: {
                to: { element: { type: layer, captured: { slice: "!{{from.element.captured.slice}}" } } },
              },
              message: `${layer}/{{from.element.captured.slice}} must not import from the sibling slice {{to.element.captured.slice}}. Move shared code down a layer or compose the slices in a higher layer.`,
            })),
            // Other slices are only reachable through their public API (index file).
            {
              from: { element: { type: ["app", "pages", "widgets", "features", "entities", "shared"] } },
              disallow: {
                to: {
                  element: {
                    type: ["pages", "widgets", "features", "entities"],
                    fileInternalPath: "!index.{ts,tsx}",
                  },
                },
              },
              message: "Import {{to.element.types.[0]}}/{{to.element.captured.slice}} through its public API (index), not {{to.element.fileInternalPath}}.",
            },
            { allow: { dependency: { relationship: { to: "internal" } } } },
          ],
        },
      ],
    },
  },
  {
    files: ["**/index.{ts,tsx}"],
    rules: {
      "max-lines": [
        "error",
        { max: 30, skipBlankLines: false, skipComments: false },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration",
          message: "Index files should only re-export public modules.",
        },
        {
          selector: "ExportDefaultDeclaration",
          message: "Index files should only re-export public modules.",
        },
        {
          selector: "ExportNamedDeclaration:not([source])",
          message: "Index files should only re-export public modules.",
        },
        {
          selector: "VariableDeclaration",
          message: "Index files should not contain implementation logic.",
        },
        {
          selector: "FunctionDeclaration",
          message: "Index files should not contain implementation logic.",
        },
        {
          selector: "ClassDeclaration",
          message: "Index files should not contain implementation logic.",
        },
        {
          selector: "TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration, TSImportEqualsDeclaration",
          message: "Index files should only re-export public modules.",
        },
        {
          selector: "ExpressionStatement, IfStatement, ForStatement, WhileStatement, TryStatement, ReturnStatement",
          message: "Index files should not contain implementation logic.",
        },
      ],
    },
  },
  {
    files: ["src/shared/ui/sidebar.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
