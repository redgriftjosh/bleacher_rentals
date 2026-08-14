import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    disableStaticImages: true,
  },
  // /changelog reads versions/*.md off disk at request time; the path is built at
  // runtime so tracing can't see it. Without this the files are missing in deploys.
  outputFileTracingIncludes: {
    "/changelog": ["./versions/**/*.md"],
  },
  turbopack: {},
  allowedDevOrigins: ["192.168.1.3"],
};

export default nextConfig;
