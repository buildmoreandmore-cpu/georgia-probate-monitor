import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Georgia Probate Monitor',
  description: 'Production-ready web app for monitoring Georgia probate filings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="mr-4 flex">
                <a className="mr-6 flex items-center space-x-2" href="/">
                  <span className="font-bold">Georgia Probate Monitor</span>
                </a>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/">
                    Dashboard
                  </a>
                  <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/cases">
                    Cases
                  </a>
                  <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/settings">
                    Settings
                  </a>
                  <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/admin">
                    Admin
                  </a>
                </nav>
              </div>
            </div>
          </nav>
          <main className="container mx-auto py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}