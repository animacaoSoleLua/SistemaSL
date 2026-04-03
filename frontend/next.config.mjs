/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@fullcalendar/react",
    "@fullcalendar/core",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "solelua.cloud" },
      { protocol: "https", hostname: "*.solelua.cloud" },
    ],
  },
};

export default nextConfig;
