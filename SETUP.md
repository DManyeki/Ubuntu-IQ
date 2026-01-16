# MindCare Kenya - Setup Instructions

## ⚠️ PowerShell Execution Policy Issue

If you see an error like "running scripts is disabled on this system", run this command **once** as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try the install commands again.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Development tools
npm install --save-dev tsx @types/node

# Core dependencies
npm install @supabase/supabase-js @vercel/blob

# PDF parsing
npm install pdfjs-dist

# Web scraping
npm install playwright cheerio

# AI
npm install @google/generative-ai

# Note: Using OpenRouter (no additional package needed - uses fetch API)
# OpenRouter provides OpenAI-compatible API

# Install Playwright browsers
npx playwright install chromium
```

### 2. Apply Database Schema

Go to your Supabase dashboard:
1. Visit: https://supabase.com/dashboard/project/ahzalqvkkztgosocbcoz/editor
2. Click "SQL Editor"
3. Copy the contents of `supabase/migrations/20240116_initial_schema.sql`
4. Run the SQL

🎉 Your database is now ready!

### 3. Create Scripts Directory

```powershell
mkdir scripts
mkdir scripts\data
mkdir scripts\pdfs
```

### 4. Test Supabase Connection

```bash
npx tsx -e "import { supabase } from './lib/supabase'; supabase.from('institutions').select('count').then(console.log)"
```

---

## 📁 Project Structure (New Files)

```
Ubuntu-IQ/
├── lib/
│   └── supabase.ts           # Supabase client config
├── scripts/
│   ├── parse-pdf.ts          # Local PDF parser (to be created)
│   ├── scrape-website.ts     # Local web scraper (to be created)
│   ├── ai-review.ts          # AI review script (to be created)
│   ├── data/                 # Extracted data output
│   └── pdfs/                 # Input PDFs
├── supabase/
│   └── migrations/
│       └── 20240116_initial_schema.sql  # Database schema
└── .env.local                # Environment variables (already created)
```

---

## ✅ Next Steps

1. **Fix PowerShell** - Run the ExecutionPolicy command above
2. **Install dependencies** - Run npm install commands
3. **Apply database schema** - Copy SQL to Supabase dashboard
4. **Test connection** - Run the test command
5. **Create scripts** - We'll create these next

---

## 🐛 Troubleshooting

### PowerShell Execution Policy

**Error:** "running scripts is disabled on this system"

**Solution:** Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Module Not Found

**Error:** "Cannot find module '@supabase/supabase-js'"

**Solution:** Make sure you ran npm install successfully

### Supabase Connection Failed

**Error:** "Failed to connect to Supabase"

**Solution:** Check your `.env.local` file has the correct values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

Ready to continue once dependencies are installed!
