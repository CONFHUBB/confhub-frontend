import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  /** Lucide icon component */
  icon?: LucideIcon
  /** Emoji or custom icon string (used instead of LucideIcon) */
  emoji?: string
  title: string
  description?: string
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string
}

/**
 * EmptyState — standard empty state illustration component.
 * Use when a list/table has no data to show.
 */
export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {/* Icon or Emoji */}
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-5">
        {emoji ? (
          <span className="text-3xl">{emoji}</span>
        ) : Icon ? (
          <Icon className="w-8 h-8 text-muted-foreground" />
        ) : (
          <span className="text-3xl">📭</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      )}

      {action && (
        <Button
          variant={action.variant ?? 'outline'}
          size="sm"
          onClick={action.onClick}
          className="mt-1"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

/** Inline mini empty state for table cells */
export function TableEmptyState({
  cols,
  title,
  description,
}: {
  cols: number
  title: string
  description?: string
}) {
  return (
    <tr>
      <td colSpan={cols} className="py-14 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-2xl">📭</span>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground/70">{description}</p>
          )}
        </div>
      </td>
    </tr>
  )
}
