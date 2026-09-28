import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure-logic tests over the domain modules (locale packs, entry sizing,
    // migrations, demo data); no DOM needed. Test files take the
    // `_test` suffix.
    environment: "node",
    include: ["tests/**/*_test.ts"],
  },
});
