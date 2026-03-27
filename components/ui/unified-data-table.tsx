"use client"

import React from "react"
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── TYPES & INTERFACES ──────────────────────────────────────────────

export interface DataTableColumn<T> {
    /** Tiêu đề hiển thị trên Header của cột (hỗ trợ text hoặc Component như Checkbox) */
    header: React.ReactNode
    /** Key để lấy data trực tiếp từ object T (bỏ qua nếu dùng cell custom) */
    accessorKey?: keyof T
    /** Hàm render UI custom (dùng cho Badge, Avatar, Format Date...) */
    cell?: (item: T) => React.ReactNode
    /** Class để custom độ rộng, align text, truncate... */
    className?: string
}

export interface UnifiedDataTableProps<T> {
    // ── Header & Titles ──
    title: string
    description?: string
    
    // ── Data & Setup ──
    columns: DataTableColumn<T>[]
    data: T[]
    isLoading?: boolean
    
    /** Hàm trả về unique key (string | number) cho mỗi row */
    keyExtractor: (item: T) => string | number
    
    // ── Search & Filters ──
    searchPlaceholder?: string
    searchValue?: string
    onSearchChange?: (value: string) => void
    
    // ── Actions ──
    /** Nút Action chính (VD: <Button>Add New</Button>), đặt bên phải thanh Search */
    primaryAction?: React.ReactNode
    /** Hàm trả về các <DropdownMenuItem> cho cột Kebab menu (dấu 3 chấm) */
    renderRowActions?: (item: T) => React.ReactNode
    
    // ── Pagination (Gold Standard) ──
    pagination?: {
        currentPage: number
        totalPages: number
        totalElements?: number
        onPageChange: (page: number) => void
    }
}

// ─── COMPONENT IMPLEMENTATION ────────────────────────────────────────

export function UnifiedDataTable<T>({
    title,
    description,
    columns,
    data,
    isLoading = false,
    searchPlaceholder = "Search...",
    searchValue,
    onSearchChange,
    primaryAction,
    renderRowActions,
    pagination,
    keyExtractor
}: UnifiedDataTableProps<T>) {
    
    return (
        <div className="space-y-4">
            {/* --- 1. Header & Toolbar --- */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    {onSearchChange && (
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder={searchPlaceholder}
                                value={searchValue || ""}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    )}
                    
                    {/* Primary Action Button */}
                    {primaryAction && (
                        <div className="flex-shrink-0">
                            {primaryAction}
                        </div>
                    )}
                </div>
            </div>

            {/* --- 2. Table Container (with overflow-x-auto) --- */}
            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                {columns.map((col, idx) => (
                                    <TableHead key={idx} className={`whitespace-nowrap ${col.className || ""}`}>
                                        {col.header}
                                    </TableHead>
                                ))}
                                {/* Header cho cột Action (nếu có) */}
                                {renderRowActions && (
                                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                            {/* States handling: Loading, Empty, and Data Rows */}
                            {isLoading ? (
                                <TableRow>
                                    <TableCell 
                                        colSpan={columns.length + (renderRowActions ? 1 : 0)} 
                                        className="h-32 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                            <span>Loading data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell 
                                        colSpan={columns.length + (renderRowActions ? 1 : 0)} 
                                        className="h-32 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <p>No data available</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={keyExtractor(item)} className="group transition-colors">
                                        {columns.map((col, idx) => (
                                            <TableCell key={idx} className={col.className}>
                                                {/* Ưu tiên custom 'cell', nếu không dùng 'accessorKey' */}
                                                {col.cell 
                                                    ? col.cell(item) 
                                                    : col.accessorKey 
                                                        ? String(item[col.accessorKey] || "") 
                                                        : null}
                                            </TableCell>
                                        ))}
                                        
                                        {/* Kebab Menu cho Row Actions */}
                                        {renderRowActions && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        {/* Nút mờ đi, chỉ hiện rõ khi hover row (Giảm noise) */}
                                                        <Button 
                                                            variant="ghost" 
                                                            className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                                        <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
                                                            Actions
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {renderRowActions(item)}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* --- 3. Pagination Footer (Gold Standard) --- */}
                {pagination && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-muted/20 border-t gap-3">
                        <div className="text-sm text-muted-foreground text-center sm:text-left">
                            Page <span className="font-medium text-foreground">{pagination.currentPage + 1}</span> of <span className="font-medium text-foreground">{pagination.totalPages || 1}</span>
                            {pagination.totalElements !== undefined && (
                                <> &middot; <span className="font-medium text-foreground">{pagination.totalElements}</span> items</>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 0}
                                className="h-8 gap-1 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage >= pagination.totalPages - 1 || pagination.totalPages === 0}
                                className="h-8 gap-1 transition-all"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
