/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async redirects() {
    return [
      {
        source: '/',
        destination: '/browse',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
