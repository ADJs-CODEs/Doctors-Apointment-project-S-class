import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repo root has an old package-lock.json; pin the project root to this folder.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  images: {
    // doctor and profile photos come from Cloudinary; Google sign-in avatars from Google
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
