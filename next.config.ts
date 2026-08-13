import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // La limite par defaut (1 Mo) est trop basse pour une photo de profil
    // envoyee via Server Action (app/(app)/mon-compte/actions.ts) -- une
    // photo de telephone la depasse presque toujours.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
