
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
    // This plugin will replace the problematic file with an empty module.
    // See: https://github.com/vercel/next.js/issues/48332
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /node_modules\/@mapbox\/node-pre-gyp\/lib\/util\/nw-pre-gyp\/index\.html/,
        require.resolve('./public/empty.js')
      )
    );
    
    return config;
  }
};

export default nextConfig;
