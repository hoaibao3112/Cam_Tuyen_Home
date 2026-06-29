import type { Metadata } from 'next'
import { Playball, Dancing_Script, Be_Vietnam_Pro, Lora } from 'next/font/google'
import './globals.css'

const playball = Playball({
  weight: '400',
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playball',
  display: 'swap',
})

const dancingScript = Dancing_Script({
  weight: ['400', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-dancing',
  display: 'swap',
})

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

const lora = Lora({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cẩm Tuyền Home - Đặt hàng nông sản & trái cây',
  description: 'Xem danh sách sản phẩm và đặt hàng nông sản, trái cây online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${playball.variable} ${dancingScript.variable} ${beVietnamPro.variable} ${lora.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}

