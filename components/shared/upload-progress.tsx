'use client'

/**
 * UploadProgress — Animated progress bar for file uploads.
 * Shows filename, progress %, and file size.
 */
interface UploadProgressProps {
    /** 0-100 */
    percent: number
    fileName?: string
    /** e.g. "2.3 MB" */
    fileSize?: string
    /** Upload complete */
    complete?: boolean
}

export function UploadProgress({ percent, fileName, fileSize, complete }: UploadProgressProps) {
    const clampedPercent = Math.min(100, Math.max(0, percent))

    return (
        <div className="w-full space-y-2">
            {/* File info row */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                    {fileName && <span className="font-medium text-foreground truncate max-w-[250px]">{fileName}</span>}
                    {fileSize && <span className="text-xs">({fileSize})</span>}
                </div>
                <span className={`text-xs font-semibold tabular-nums ${complete ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {complete ? '✓ Complete' : `${clampedPercent}%`}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                        complete
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                    }`}
                    style={{ width: `${clampedPercent}%` }}
                />
            </div>
        </div>
    )
}
