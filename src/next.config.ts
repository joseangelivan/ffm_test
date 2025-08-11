
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
  webpack: (config, { isServer, webpack }) => {
    // This is a workaround for a bug in Next.js where it tries to bundle
    // a file from a dependency that is not meant to be bundled.
    // This rule tells Webpack to treat the problematic file as an empty module.
    config.module.rules.push({
      test: /node_modules\/@mapbox\/node-pre-gyp\/lib\/util\/nw-pre-gyp\/index\.html$/,
      use: 'null-loader',
    });
    
    return config;
  }
};

export default nextConfig;
