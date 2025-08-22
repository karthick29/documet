import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: ' Senthil Associates Bank Data Extractor',
  description: 'Senthil Associates Bank Data Extractor',
  generator: 'Senthil Associates Bank Data Extractor',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
