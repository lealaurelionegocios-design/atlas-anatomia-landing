/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esportazione statica: l'app gira interamente nel browser, senza server.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
