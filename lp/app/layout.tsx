import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShopDesigner AI - AI駆動の店舗デザインソリューション',
  description: 'AIを活用して、あなたの店舗に最適なバナーデザインを自動生成。革新的なデザインツールで売上アップを実現します。',
  keywords: ['AI', 'デザイン', 'バナー', '店舗', 'ショップ', 'eコマース'],
  openGraph: {
    title: 'ShopDesigner AI',
    description: 'AI駆動の店舗デザインソリューション',
    url: 'https://www.shopdesignerai.com',
    siteName: 'ShopDesigner AI',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  )
}
