/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "solelua.cloud" },
      { protocol: "https", hostname: "*.solelua.cloud" },
    ],
  },
};

export default nextConfig;
