module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: ["eslint:recommended"],
  ignorePatterns: ["node_modules", "dist", "coverage"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script"
  },
  rules: {
    "no-unused-vars": "off"
  }
};
