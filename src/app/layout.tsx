import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

// Firebase はクライアントのみで動作するため、ビルド時の静的生成を無効化
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Stocky',
  description: '家族の冷蔵庫・ストックをリアルタイム共有',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Stocky',
  },
  openGraph: {
    title: 'Stocky',
    description: '家族の冷蔵庫・ストックをリアルタイム共有',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#2D6A4F',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="stocky">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
