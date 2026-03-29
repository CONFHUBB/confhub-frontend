import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from '@/components/ui/table'

interface TableSkeletonProps {
  rows?: number
  cols?: number
  /** If provided, renders col header labels */
  headers?: string[]
  className?: string
}

/**
 * TableSkeleton — drop-in replacement for loading tables.
 * Renders animated skeleton rows matching the column count.
 */
export function TableSkeleton({ rows = 5, cols = 5, headers, className }: TableSkeletonProps) {
  const colCount = headers ? headers.length : cols
  return (
    <div className={className}>
      <Table>
        {headers && (
          <TableHeader>
            <TableRow className="bg-muted/30">
              {headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: colCount }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton
                    className="h-4 w-full"
                    style={{ width: j === 0 ? '40px' : j === colCount - 1 ? '60px' : undefined }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Lightweight card grid skeleton for stat cards */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  )
}
