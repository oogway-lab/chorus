/** @type {import('next').NextConfig} */
const nextConfig = {
    // The server modules import the workspace package directly from source.
    transpilePackages: ["@chorus/llm-core"],
    experimental: {
        // pg and pg-boss are server-only; keep them external to the bundle.
        serverComponentsExternalPackages: ["pg", "pg-boss"],
    },
};

export default nextConfig;
