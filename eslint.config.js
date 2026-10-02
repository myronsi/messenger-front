import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
