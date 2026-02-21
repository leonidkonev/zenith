/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zenith/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
