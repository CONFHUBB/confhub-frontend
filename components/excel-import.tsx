"use client"

import { useState, useRef, type ChangeEvent, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import type { ImportResult, ImportError } from "@/app/api/conference.api"
import toast from "react-hot-toast"

interface ExcelImportProps {
    entityName: string
    previewHeaders: string[]
    onDownloadTemplate: () => Promise<Blob>
    onPreview: (file: File) => Promise<ImportResult>
    onImport: (file: File) => Promise<ImportResult>
    onImportSuccess?: (result: ImportResult) => void
    templateFilename?: string
}

export function ExcelImport({
    entityName,
    previewHeaders,
    onDownloadTemplate,
    onPreview,
    onImport,
    onImportSuccess,
    templateFilename = "template.xlsx"
}: ExcelImportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [preview, setPreview] = useState<ImportResult | null>(null)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)

    const handleDownload = async () => {
        try {
            const blob = await onDownloadTemplate()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url; a.download = templateFilename
            document.body.appendChild(a); a.click()
            window.URL.revokeObjectURL(url); document.body.removeChild(a)
            toast.success("Template downloaded!")
        } catch { toast.error("Failed to download template") }
    }

    const validateAndSetFile = (f: File) => {
        if (!f.name.endsWith(".xlsx")) { toast.error("Only .xlsx files"); return }
        if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return }
        setFile(f); setPreview(null); setImportResult(null)
    }

    const handlePreview = async () => {
        if (!file) return
        setIsLoading(true)
        try {
            const result = await onPreview(file)
            setPreview(result)
            if (!result.success) toast.error("Validation errors found")
        } catch (e: any) {
            const data = e.response?.data
            if (data?.errors) setPreview(data)
            else toast.error(data?.detail || "Preview failed")
        } finally { setIsLoading(false) }
    }

    const handleConfirmImport = async () => {
        if (!file) return
        setIsLoading(true)
        try {
            const result = await onImport(file)
            setImportResult(result)
            if (result.success) {
                toast.success(`${entityName} imported successfully!`)
                onImportSuccess?.(result)
            }
        } catch (e: any) {
            const data = e.response?.data
            if (data?.errors) setImportResult(data)
            else toast.error(data?.detail || "Import failed")
        } finally { setIsLoading(false) }
    }

    const handleClear = () => {
        setFile(null); setPreview(null); setImportResult(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    // Get preview data based on entity
    const previewRows: Record<string, string>[] =
        preview?.conferencePreview ? [preview.conferencePreview] :
        (preview?.trackPreviews?.length ?? 0) > 0 ? preview!.trackPreviews! :
        (preview?.subjectAreaPreviews?.length ?? 0) > 0 ? preview!.subjectAreaPreviews! :
        (preview?.memberPreviews?.length ?? 0) > 0 ? preview!.memberPreviews! : []

    return (
        <div className="space-y-4">
            {/* Row 1: Template + Upload */}
            <div className="flex items-center gap-3 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
                    <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Template
                </Button>

                <div
                    className={`flex-1 min-w-[200px] flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
                        isDragging ? "border-blue-500 bg-blue-50" :
                        file ? "border-green-400 bg-green-50" :
                        "border-gray-300 hover:border-gray-400"
                    }`}
                    onDragOver={(e: DragEvent) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={(e: DragEvent) => { e.preventDefault(); setIsDragging(false) }}
                    onDrop={(e: DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) validateAndSetFile(f) }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {file ? (
                        <div className="flex items-center gap-2 text-sm">
                            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                            </svg>
                            <span className="font-medium text-green-700">{file.name}</span>
                            <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-500">
                            <span className="font-medium text-blue-600">Click to upload</span> or drag & drop (.xlsx)
                        </span>
                    )}
                    <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f) }} />
                </div>

                {file && !preview && (
                    <Button type="button" size="sm" onClick={handlePreview} disabled={isLoading}>
                        {isLoading ? "Loading..." : "Preview"}
                    </Button>
                )}
                {file && <Button type="button" variant="ghost" size="sm" onClick={handleClear}>✕</Button>}
            </div>

            {/* Preview Table */}
            {preview && preview.success && previewRows.length > 0 && (
                <div className="space-y-3">
                    <div className="overflow-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-8">#</th>
                                    {previewHeaders.map(h => (
                                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                                    ))}
                                    {previewRows[0]?.status && (
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((row, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                        {previewHeaders.map(h => (
                                            <td key={h} className="px-3 py-2 max-w-[200px] truncate">{row[h] || <span className="text-gray-300">—</span>}</td>
                                        ))}
                                        {row.status && (
                                            <td className="px-3 py-2">
                                                {row.status === "EXISTING" ? (
                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                                        ✓ In System
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                                                        ⚡ New Account
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-green-600 font-medium">
                            ✓ {previewRows.length} {entityName.toLowerCase()}(s) ready to import
                        </p>
                        <Button type="button" size="sm" onClick={handleConfirmImport} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading ? "Importing..." : `Confirm Import (${previewRows.length})`}
                        </Button>
                    </div>
                </div>
            )}

            {/* Errors */}
            {preview && !preview.success && preview.errors?.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">Validation Errors</h4>
                    <div className="overflow-auto max-h-48">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-red-100/50">
                                    <th className="px-3 py-1 text-left text-red-700">Row</th>
                                    <th className="px-3 py-1 text-left text-red-700">Column</th>
                                    <th className="px-3 py-1 text-left text-red-700">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.errors.map((e, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="px-3 py-1">{e.row}</td>
                                        <td className="px-3 py-1 font-mono text-xs">{e.column}</td>
                                        <td className="px-3 py-1 text-red-700">{e.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Import Success */}
            {importResult?.success && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-800">
                        ✓ Import completed successfully!
                        {importResult.conferenceName && ` — ${importResult.conferenceName}`}
                        {importResult.tracksCreated > 0 && ` — ${importResult.tracksCreated} tracks`}
                        {importResult.subjectAreasCreated > 0 && ` — ${importResult.subjectAreasCreated} subject areas`}
                    </p>
                </div>
            )}
        </div>
    )
}
