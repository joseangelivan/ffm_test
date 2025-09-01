
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
    // This prevents the "Module not found: Can't resolve 'pg-native'" error.
    // The pg library optionally tries to require a native binding that's not needed for standard use.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pg-native": false,
      };
    }
    
    return config;
  }
};

export default nextConfig;
