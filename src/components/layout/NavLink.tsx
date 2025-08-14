'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'transition-colors hover:text-foreground/80 text-sm font-medium px-3 py-2 rounded-md',
        isActive
          ? 'text-foreground bg-accent'
          : 'text-foreground/60',
        className
      )}
    >
      {children}
    </Link>
  )
}