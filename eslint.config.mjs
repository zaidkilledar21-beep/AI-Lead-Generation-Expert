import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "coverage/**"
    ],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;
