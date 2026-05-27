import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**/*": [
      "./src/generated/prisma/**/*",
      "./node_modules/@prisma/engines/**/*",
    ],
    "/api/**/*": [
      "./src/generated/prisma/**/*",
      "./node_modules/@prisma/engines/**/*",
    ],
  },
};

export default nextConfig;
