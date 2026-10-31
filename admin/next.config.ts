import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repo root has an old package-lock.json; pin the project root to this folder.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
