$base = "c:\Users\sugoi\Desktop\đồ án\confms-frontend"
$count = 0

# Pattern: Replace local STATUS_CONFIG/STATUS_COLORS/STATUS_COLOR definitions with centralized imports
$files = Get-ChildItem -Path $base -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.next*" -and $_.FullName -notlike "*status.ts" }

foreach ($file in $files) {
    $c = [System.IO.File]::ReadAllText($file.FullName)
    
    # Check if file has a local STATUS_CONFIG or STATUS_COLORS or STATUS_COLOR
    if ($c -match "const STATUS_CONFIG" -or $c -match "const STATUS_COLORS" -or $c -match "const STATUS_COLOR[^S]") {
        
        # Check if it also already has the centralized import
        if ($c -match "from '@/lib/constants/status'" -or $c -match "from `"@/lib/constants/status`"") {
            # Already has centralized import, skip
            continue
        }
        
        Write-Host "NEEDS MIGRATION: $($file.Name) at $($file.FullName)"
        $count++
    }
}

Write-Host "`n$count files still need STATUS migration"
