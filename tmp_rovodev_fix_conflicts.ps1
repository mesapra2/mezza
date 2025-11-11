#!/usr/bin/env pwsh
# Script to fix merge conflicts automatically

Write-Host "🔧 Starting automatic merge conflict resolution..." -ForegroundColor Green

# Get all files with merge conflicts
$conflictFiles = git grep -l "<<<<<<< HEAD" 2>$null

if ($conflictFiles.Count -eq 0) {
    Write-Host "✅ No merge conflicts found!" -ForegroundColor Green
    exit 0
}

Write-Host "📋 Found $($conflictFiles.Count) files with merge conflicts" -ForegroundColor Yellow

foreach ($file in $conflictFiles) {
    Write-Host "🔄 Processing: $file" -ForegroundColor Cyan
    
    # Read file content
    $content = Get-Content $file -Raw
    
    # Simple pattern replacement - we'll take the HEAD version (current branch)
    # and remove the conflict markers
    $content = $content -replace '<<<<<<< HEAD\r?\n', ''
    $content = $content -replace '=======\r?\n[\s\S]*?>>>>>>> [a-f0-9]+', ''
    $content = $content -replace '=======[\s\S]*?>>>>>>> [a-f0-9]+', ''
    
    # Write back to file
    Set-Content -Path $file -Value $content -NoNewline
    
    Write-Host "✅ Fixed: $file" -ForegroundColor Green
}

Write-Host "🎉 All merge conflicts resolved!" -ForegroundColor Green
Write-Host "📝 Files processed: $($conflictFiles.Count)" -ForegroundColor Yellow