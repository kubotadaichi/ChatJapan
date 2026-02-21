import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Header } from '@/components/layout/Header'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatJapan',
  description: '日本の統計情報を地図で探索するチャットサービス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} overflow-hidden flex flex-col h-screen`}>
        <AuthProvider>
          <Header />
          <div className="flex-1 overflow-hidden">{children}</div>
        </AuthProvider>
      </body>
    </html>
  )
}

