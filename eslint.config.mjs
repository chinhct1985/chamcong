import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "node_modules/**"]),
  {
    rules: {
      // Cho phép fetch + setState trong useEffect (mẫu load dữ liệu phổ biến)
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
