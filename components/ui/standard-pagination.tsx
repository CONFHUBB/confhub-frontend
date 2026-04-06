"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StandardPaginationProps {
  /** 0-based current page index */
  currentPage: number
  totalPages: number
  totalElements: number
  /** Noun label, e.g. "members", "papers" */
  entityName: string
  onPageChange: (page: number) => void
  /** Max visible page-number buttons (default 5) */
  maxPageButtons?: number
}

/**
 * StandardPagination — the single source-of-truth pagination bar for the whole app.
 *
 * Layout:
 *   [Page X of Y · N items]        [◀ Previous] [1] [2] ... [N] [Next ▶]
 */
export function StandardPagination({
  currentPage,
  totalPages,
  totalElements,
  entityName,
  onPageChange,
  maxPageButtons = 5,
}: StandardPaginationProps) {
  // Always render — even for 1 page — so users always see the count info
  const safeTotalPages = Math.max(totalPages, 1)

  // Calculate visible page window
  const half = Math.floor(maxPageButtons / 2)
  let start = Math.max(0, currentPage - half)
  let end = start + maxPageButtons
  if (end > safeTotalPages) {
    end = safeTotalPages
    start = Math.max(0, end - maxPageButtons)
  }
  const pageNumbers = Array.from({ length: end - start }, (_, i) => start + i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-muted/20 gap-3">
      {/* Info text */}
      <div className="text-sm text-muted-foreground text-center sm:text-left">
        Page{" "}
        <span className="font-medium text-foreground">{currentPage + 1}</span>{" "}
        of{" "}
        <span className="font-medium text-foreground">{safeTotalPages}</span>
        {" · "}
        <span className="font-medium text-foreground">{totalElements}</span>{" "}
        {entityName}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 text-xs ${
              page === currentPage ? "bg-indigo-600 hover:bg-indigo-700" : ""
            }`}
            onClick={() => onPageChange(page)}
          >
            {page + 1}
          </Button>
        ))}

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= safeTotalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
