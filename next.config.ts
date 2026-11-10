import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O app é autenticado e sempre lê dados por usuário. Não usamos cache de
  // páginas para evitar qualquer risco de vazar dados entre sessões.
  cacheComponents: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
