/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zenith/shared'],
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/__api/:path*',
        destination: 'http://127.0.0.1:4000/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://127.0.0.1:4000/socket.io/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
