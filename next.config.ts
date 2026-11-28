import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{source: '/widget', destination: '/installation', permanent: true}];
  },
};

export default nextConfig;
