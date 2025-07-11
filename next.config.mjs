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
};

export default nextConfig;
