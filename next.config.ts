import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  env: {
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  },
};

export default nextConfig;
