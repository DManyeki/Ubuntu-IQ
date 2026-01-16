# PDF Parser - Quick Start Guide

## Usage

```powershell
# Parse a KUCCPS PDF
npx tsx scripts/parse-pdf.ts scripts/pdfs/your-kuccps-file.pdf
```

## Expected PDF Format

The parser looks for lines in this format:
```
Institution Name - Program Name - KUCCPS_CODE - Minimum Grade
```

**Examples:**
- `University of Nairobi - Bachelor of Science (Computer Science) - C001-100 - B+`
- `Kenyatta University - Diploma in Business Management - D002-050 - C+`
- `JKUAT - BSc Engineering - C003-075 - B`

## What It Does

1. **Extracts text** from all PDF pages
2. **Parses data** using pattern matching
3. **Removes duplicates** based on KUCCPS code
4. **Saves to Supabase** in `ingest_jobs` table
5. **Exports JSON** to `scripts/data/` for review

## Output

After running, you'll get:
- ✅ Ingest job created in Supabase
- ✅ JSON export in `scripts/data/parsed-TIMESTAMP.json`
- ✅ Summary statistics (total programs, top institutions)

## Testing

1. Place a sample KUCCPS PDF in `scripts/pdfs/`
2. Run the parser
3. Check the JSON output
4. Verify data in Supabase dashboard

## Troubleshooting

### "No programs found"
- PDF format doesn't match expected pattern
- Check the PDF manually and adjust regex patterns in `parseKUCCPSData()`

### "Database error"
- Verify Supabase credentials in `.env.local`
- Check that `ingest_jobs` table exists

### "Module not found"
- Run `npm install` to ensure all dependencies are installed

## Next Steps

After parsing:
1. Review extracted data in JSON file
2. Run AI review script (coming next)
3. Approve and import data into main tables
