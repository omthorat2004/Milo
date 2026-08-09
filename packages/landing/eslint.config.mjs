import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships native flat configs, so no eslintrc compatibility
 * layer is needed.
 */
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", ".data/**"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
