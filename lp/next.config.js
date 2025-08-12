/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
}

module.exports = nextConfig
