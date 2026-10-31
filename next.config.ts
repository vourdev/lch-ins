import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1 MB terlalu kecil untuk berkas KYC (batas berkas 4 MB di
      // lib/uploads.ts). Sisanya untuk pembungkus multipart.
      bodySizeLimit: "5mb",
    },
  },
}

export default nextConfig
