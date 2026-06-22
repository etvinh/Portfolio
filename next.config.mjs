/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles a minimal Node server + just the deps it needs.
  // The production Docker image copies .next/standalone and runs node server.js.
  output: 'standalone',
};

export default nextConfig;
