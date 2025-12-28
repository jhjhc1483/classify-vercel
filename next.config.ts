import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포 시 assets 폴더를 강제로 포함시키는 설정
  outputFileTracingIncludes: {
    '/api/analyze': ['./assets/**/*'],
  },
};

export default nextConfig;