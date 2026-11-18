import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["vendor/**", "node_modules/**", "public/**", "storage/**", "bootstrap/cache/**", ".next/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["resources/**/*.tsx"], plugins: { "react-hooks": reactHooks }, rules: {
    "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn",
  } },
);
