import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: [
        "src/lib/money.ts",
        "src/lib/dates.ts",
        "src/lib/finance.ts",
        "src/lib/statement.ts",
      ],
    },
  },
});
