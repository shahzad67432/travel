/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,  // Disable ESLint during production builds
      },
};

export default nextConfig;
