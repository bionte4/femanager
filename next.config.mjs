/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mitigasi DoS Image Optimizer (Next 14 EOL) — asset dilayani apa adanya
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Semua /uploads/* lewat auth-gated /api/files (storage privat + legacy public)
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/files/:path*",
      },
    ];
  },
};

export default nextConfig;
