/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/albums', permanent: true },
      { source: '/browse/:slug', destination: '/albums', permanent: true },
      { source: '/collection/:slug', destination: '/albums', permanent: true }
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
    ],
  },
};

export default nextConfig;
