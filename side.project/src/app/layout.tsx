import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AppVision — See Your Website as a Mobile App',
  description: 'Enter your website URL and instantly preview it as a beautiful, interactive mobile app. Free, no signup required.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
