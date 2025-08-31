'use client'

import { MobileNav } from '@/components/ui/MobileNav'
import { NavLink } from '@/components/layout/NavLink'

const navigationLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cases', label: 'Cases' },
  { href: '/settings', label: 'Settings' },
  { href: '/admin', label: 'Admin' },
]

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile Navigation */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="text-base font-semibold">GA Probate</span>
        <MobileNav links={navigationLinks} />
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">Georgia Probate Monitor</span>
          <div className="flex items-center space-x-2">
            {navigationLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}