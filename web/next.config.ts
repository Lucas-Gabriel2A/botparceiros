import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
  // Configuração moderna para Next.js 15/16 (funciona com Turbopack)
  serverExternalPackages: ['discord.js', '@discordjs/ws', 'zlib-sync', 'utf-8-validate', 'bufferutil'],

  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Client-side: Alias false to ignore
    config.resolve.alias = {
      ...config.resolve.alias,
      'zlib-sync': false,
      'utf-8-validate': false,
      'bufferutil': false,
    };

    // Server-side: Treat as externals BUT we don't have them installed in web/
    // So alias false is better for build reliability if we don't need them.
    // However, discord.js lazy imports might still trigger resolution.
    // Let's try explicit CommonJS external if alias fails, but actually,
    // since we are failing "Module not found", alias false IS crucial.

    // Let's broaden the alias to catch potentially nested imports if needed
    // or ensure externals are also set to avoid bundling attempts.
    if (isServer) {
      config.externals.push({
        'zlib-sync': 'commonjs zlib-sync',
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
      // Override aliases for server to allow runtime require (will fail if not present but build passes)
      // actually if user doesn't have them, build fails because it tries to find them.
      // So for server if we don't have them installed: alias false.
    }

    return config;
  },
};

export default withNextIntl(nextConfig);
