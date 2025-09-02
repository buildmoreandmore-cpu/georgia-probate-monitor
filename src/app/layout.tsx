import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { ClerkProvider } from '@clerk/nextjs'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Georgia Probate Monitor v2.0',
  description: 'Production-ready web app for monitoring Georgia probate filings with PostgreSQL',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} overflow-x-hidden`}>
          <ErrorBoundary>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main className="py-6">
                {children}
              </main>
            </div>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}