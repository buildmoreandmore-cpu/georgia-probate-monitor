import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'danger'
  className?: string
}

export function StatsCard({ label, value, tone = 'default', className }: StatsCardProps) {
  const dotColor = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
  }[tone]

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 shadow-sm',
      className
    )}>
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', dotColor)} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}