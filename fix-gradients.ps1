$base = "c:\project\invoice-system-main"

# chat
$f = "$base\app\chat\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', 'bg-gray-50 dark:bg-gray-950'
Set-Content $f -Value $c -Encoding UTF8

# payments
$f = "$base\app\payments\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', 'bg-gray-50 dark:bg-gray-950'
Set-Content $f -Value $c -Encoding UTF8

# purchase-entry
$f = "$base\app\purchase-entry\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', 'bg-gray-50 dark:bg-gray-950'
$c = $c -replace 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100', 'border-b'
$c = $c -replace 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg', 'bg-gray-50 border border-gray-200 rounded-lg'
Set-Content $f -Value $c -Encoding UTF8

# ledger
$f = "$base\app\ledger\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', 'bg-gray-50 dark:bg-gray-950'
Set-Content $f -Value $c -Encoding UTF8

# reports
$f = "$base\app\reports\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', 'bg-gray-50 dark:bg-gray-950'
Set-Content $f -Value $c -Encoding UTF8

# bank
$f = "$base\app\bank\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100', 'border-b'
Set-Content $f -Value $c -Encoding UTF8

# upload
$f = "$base\app\upload\page.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw -Encoding UTF8
  $c = $c -replace 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b', 'border-b'
  Set-Content $f -Value $c -Encoding UTF8
}

# invoice-downloads
$f = "$base\app\invoice-downloads\page.tsx"
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'bg-gradient-to-r from-blue-50 to-indigo-50', 'bg-gray-50 dark:bg-gray-800/50'
Set-Content $f -Value $c -Encoding UTF8

Write-Output "DONE"
