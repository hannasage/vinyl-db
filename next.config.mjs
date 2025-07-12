/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/browse/:slug', destination: '/', permanent: true },
      { source: '/collection/:slug', destination: '/', permanent: true }
    ]
  },
  images: {
    loader: 'default',
    unoptimized: true,
  },
  // Suppress hydration warnings in development
  reactStrictMode: true,
  // Add experimental features for better hydration handling
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
