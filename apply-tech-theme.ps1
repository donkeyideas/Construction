$srcDir = "c:\Users\beltr\Construction.erp\mockups"
$destDir = "c:\Users\beltr\Construction.erp\mockups-tech"

$files = @(
    "01-homepage.html",
    "02-login.html",
    "03-registration.html",
    "04-executive-dashboard.html",
    "05-financial-command-center.html",
    "06-project-list.html",
    "07-project-detail.html",
    "08-gantt-schedule.html",
    "09-daily-log.html"
)

foreach ($file in $files) {
    $srcPath = Join-Path $srcDir $file
    $destPath = Join-Path $destDir $file

    Write-Host "Processing $file..."

    $content = Get-Content $srcPath -Raw -Encoding UTF8

    # ============================================================
    # 1. Replace Tailwind config block (brand/accent/surface/border colors)
    # ============================================================
    $content = $content -replace "brand: \{ DEFAULT: '#3b82f6', light: '#60a5fa', dark: '#2563eb' \}", "brand: { DEFAULT: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' }"
    $content = $content -replace "accent: \{ DEFAULT: '#f59e0b', light: '#fbbf24', dark: '#d97706' \}", "accent: { DEFAULT: '#06b6d4', light: '#22d3ee', dark: '#0891b2' }"
    $content = $content -replace "surface: \{ dark: '#141414', light: '#f8f9fa' \}", "surface: { dark: '#1a0a2e', light: '#faf5ff' }"
    $content = $content -replace "border: \{ dark: '#262626', light: '#e5e7eb' \}", "border: { dark: '#2d1b4e', light: '#e2d1f9' }"

    # ============================================================
    # 2. Replace gradient-text CSS
    # ============================================================
    $content = $content -replace "\.gradient-text \{ background: linear-gradient\(135deg, #3b82f6, #f59e0b\);", ".gradient-text { background: linear-gradient(135deg, #8b5cf6, #06b6d4);"

    # ============================================================
    # 3. Add gradient-btn CSS after gradient-text rule (only if not already present)
    # ============================================================
    if ($content -notmatch "\.gradient-btn") {
        $content = $content -replace "(-webkit-text-fill-color: transparent; \})", "`$1`n    .gradient-btn { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }`n    .gradient-btn:hover { background: linear-gradient(135deg, #7c3aed, #0891b2); }"
    }

    # ============================================================
    # 4. Replace dark mode body background
    # ============================================================
    $content = $content -replace "dark:bg-\[#0a0a0a\]", "dark:bg-[#0d0117]"

    # ============================================================
    # 5. Replace surface/card dark backgrounds
    # ============================================================
    $content = $content -replace "dark:bg-\[#141414\]", "dark:bg-[#1a0a2e]"
    $content = $content -replace 'bg-\[#141414\]', 'bg-[#1a0a2e]'

    # ============================================================
    # 6. Replace sidebar dark background
    # ============================================================
    $content = $content -replace "dark:bg-\[#0f0f0f\]", "dark:bg-[#130a24]"
    $content = $content -replace 'bg-\[#0f0f0f\]', 'bg-[#130a24]'

    # ============================================================
    # 7. Replace dark borders
    # ============================================================
    $content = $content -replace "dark:border-\[#262626\]", "dark:border-[#2d1b4e]"
    $content = $content -replace 'border-\[#262626\]', 'border-[#2d1b4e]'

    # ============================================================
    # 8. Replace light mode surface backgrounds
    # ============================================================
    $content = $content -replace 'bg-\[#f8f9fa\]', 'bg-[#faf5ff]'
    $content = $content -replace 'bg-\[#f3f4f6\]', 'bg-[#f5f0ff]'

    # ============================================================
    # 9. Replace light mode borders
    # ============================================================
    $content = $content -replace 'border-\[#e5e7eb\]', 'border-[#e2d1f9]'

    # ============================================================
    # 10. Replace hardcoded hex brand colors in inline styles/SVG
    # ============================================================
    # Main brand blue -> electric violet
    $content = $content -replace '#3b82f6', '#8b5cf6'
    # Brand light blue -> violet light
    $content = $content -replace '#60a5fa', '#a78bfa'
    # Brand dark blue -> violet dark
    $content = $content -replace '#2563eb', '#7c3aed'

    # ============================================================
    # 11. Replace accent colors (amber/gold -> cyan/teal)
    # ============================================================
    $content = $content -replace '#f59e0b', '#06b6d4'
    $content = $content -replace '#fbbf24', '#22d3ee'
    $content = $content -replace '#d97706', '#0891b2'

    # ============================================================
    # 12. Replace rgba values for brand (blue -> purple)
    # ============================================================
    $content = $content -replace 'rgba\(59, 130, 246,', 'rgba(139, 92, 246,'

    # ============================================================
    # 13. Replace rgba values for accent (amber -> cyan)
    # ============================================================
    $content = $content -replace 'rgba\(245, 158, 11,', 'rgba(6, 182, 212,'

    # ============================================================
    # 14. Replace scrollbar thumb colors
    # ============================================================
    $content = $content -replace 'background: #262626;', 'background: #2d1b4e;'
    $content = $content -replace 'background: #404040;', 'background: #3d2266;'
    $content = $content -replace 'border-color: #404040;', 'border-color: #3d2266;'
    $content = $content -replace 'background: #333;', 'background: #2d1b4e;'

    # ============================================================
    # 15. Replace .nav-active::before and .phase-current colors
    # ============================================================
    # These were already handled by #3b82f6 -> #8b5cf6 replacement

    # ============================================================
    # 16. Replace login page left-gradient
    # ============================================================
    $content = $content -replace '#0f172a', '#0d0117'
    $content = $content -replace '#1e293b', '#1a0a2e'

    # ============================================================
    # 17. Replace #161616 (hover bg in gantt)
    # ============================================================
    $content = $content -replace 'dark:bg-\[#161616\]', 'dark:bg-[#1f0e38]'
    $content = $content -replace '#161616', '#1f0e38'

    # ============================================================
    # 18. Replace focus ring offset colors
    # ============================================================
    $content = $content -replace 'dark:focus:ring-offset-\[#0a0a0a\]', 'dark:focus:ring-offset-[#0d0117]'

    # ============================================================
    # 19. Replace primary buttons with gradient-btn class
    # ============================================================
    # "Get Started" nav button
    $content = $content -replace 'class="text-sm bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg transition-colors font-medium"', 'class="text-sm gradient-btn text-white px-4 py-2 rounded-lg transition-colors font-medium"'

    # Hero "Start Free Trial"
    $content = $content -replace 'class="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white px-8 py-3\.5 rounded-lg text-base font-semibold transition-colors"', 'class="w-full sm:w-auto gradient-btn text-white px-8 py-3.5 rounded-lg text-base font-semibold transition-colors"'

    # CTA "Start Your Free Trial"
    $content = $content -replace 'class="bg-brand hover:bg-brand-dark text-white px-8 py-3\.5 rounded-lg font-semibold transition-colors"', 'class="gradient-btn text-white px-8 py-3.5 rounded-lg font-semibold transition-colors"'

    # Login "Sign In" button
    $content = $content -replace 'class="w-full py-2\.5 px-4 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg', 'class="w-full py-2.5 px-4 gradient-btn text-white text-sm font-semibold rounded-lg'

    # Registration continue buttons
    $content = $content -replace 'class="w-full bg-brand hover:bg-brand-dark text-white py-2\.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-2"', 'class="w-full gradient-btn text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-2"'

    # Registration create account button
    $content = $content -replace 'class="w-full bg-brand hover:bg-brand-dark text-white py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2', 'class="w-full gradient-btn text-white py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2'

    # ============================================================
    # 20. Replace "or continue with" divider background
    # ============================================================
    $content = $content -replace 'dark:bg-\[#0a0a0a\] bg-white px-3', 'dark:bg-[#0d0117] bg-white px-3'

    # ============================================================
    # 21. Replace #333 border in tables (daily log)
    # ============================================================
    $content = $content -replace 'dark:border-\[#333\]', 'dark:border-[#2d1b4e]'

    # ============================================================
    # 22. Replace #d1d5db (light scrollbar/borders)
    # ============================================================
    $content = $content -replace 'border-\[#d1d5db\]', 'border-[#d4b8f0]'
    $content = $content -replace 'background: #d1d5db;', 'background: #d4b8f0;'
    $content = $content -replace 'border-color: #d1d5db;', 'border-color: #d4b8f0;'

    # ============================================================
    # 23. Increase border radius to 12px (more rounded feel)
    # ============================================================
    # The rounded-xl already maps to 12px in Tailwind, so no change needed.
    # rounded-lg = 8px stays the same for form elements

    # ============================================================
    # Write the output file
    # ============================================================
    [System.IO.File]::WriteAllText($destPath, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  -> Written to $destPath"
}

Write-Host "`nAll 9 files processed successfully!"
