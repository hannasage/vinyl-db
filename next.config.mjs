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
      // Allow images from external sources for Tavily artwork search
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
