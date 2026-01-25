# Quick Setup Commands for Windows

Write-Host "Setting up MindCare Kenya development environment..." -ForegroundColor Green

# 1. Fix PowerShell execution policy (run PowerShell as Administrator)
Write-Host "`n1. Setting execution policy..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 2. Install development dependencies
Write-Host "`n2. Installing dev dependencies..." -ForegroundColor Yellow
npm install --save-dev tsx @types/node

# 3. Install core dependencies
Write-Host "`n3. Installing core dependencies..." -ForegroundColor Yellow
npm install @supabase/supabase-js @vercel/blob pdfjs-dist playwright cheerio

# 4. Install Playwright browsers
Write-Host "`n4. Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install chromium

# 5. Create directories
Write-Host "`n5. Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "scripts\data" -Force | Out-Null
New-Item -ItemType Directory -Path "scripts\pdfs" -Force | Out-Null

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Apply database schema to Supabase" -ForegroundColor White
Write-Host "  2. Add your admin email to .env.local" -ForegroundColor White
Write-Host "  3. Test connection: npx tsx -e `"import { supabase } from './lib/supabase'; supabase.from('institutions').select('count').then(console.log)`"" -ForegroundColor White
