module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["node_modules", "dist", "test-results"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  }
};
