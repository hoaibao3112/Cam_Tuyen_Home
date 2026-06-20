import type { Metadata } from 'next'
import { Playball, Dancing_Script } from 'next/font/google'
import './globals.css'

const playball = Playball({
  weight: '400',
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playball',
})

const dancingScript = Dancing_Script({
  weight: ['400', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-dancing',
})

export const metadata: Metadata = {
  title: 'Menu đặt món',
  description: 'Xem menu và đặt món online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${playball.variable} ${dancingScript.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}

