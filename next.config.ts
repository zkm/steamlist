import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Docker build sets NEXT_OUTPUT=standalone; local `yarn build`/`yarn start` are unchanged.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};

export default nextConfig;
