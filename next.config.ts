
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This is a workaround for a bug in Next.js where it tries to bundle
    // a file from a dependency that is not meant to be bundled.
    // See: https://github.com/vercel/next.js/issues/48332
    config.module.rules.push({
      test: /\.html$/,
      use: 'raw-loader',
    });

    config.externals.push('node-pre-gyp');
    
    return config;
  }
};

export default nextConfig;
