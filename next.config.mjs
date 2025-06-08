/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/browse/:slug', destination: '/', permanent: true },
      { source: '/collection/:slug', destination: '/', permanent: true }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dwnodxgkqevbqfkfyggd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/artwork/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/artwork/**',
      },
    ],
  },
};

export default nextConfig;
