'use client'

import { MobileNav } from '@/components/ui/MobileNav'
import { NavLink } from '@/components/layout/NavLink'
import { UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { isAdminUser } from '@/lib/admin'

const publicLinks: { href: string; label: string }[] = []

const regularLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cases', label: 'Cases' },
]

const adminLinks = [
  { href: '/settings', label: 'Settings' },
  { href: '/admin', label: 'Admin' },
]

export function Navbar() {
  const { isSignedIn, user } = useUser()

  // Check if current user is admin
  const isAdmin = isAdminUser(user?.primaryEmailAddress?.emailAddress)

  // Build links based on user role
  const currentLinks = isSignedIn 
    ? [...publicLinks, ...regularLinks, ...(isAdmin ? adminLinks : [])]
    : publicLinks

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile Navigation */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="text-base font-semibold">GA Probate</span>
        <div className="flex items-center gap-4">
          <MobileNav links={currentLinks} />
          <div className="ml-2">
            {isSignedIn ? (
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8'
                  }
                }}
              />
            ) : (
              <Link 
                href="/sign-in" 
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">Georgia Probate Monitor</span>
          <div className="flex items-center space-x-2">
            {currentLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link 
              href="/sign-in" 
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}