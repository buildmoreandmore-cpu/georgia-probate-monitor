# Georgia Probate Monitor - Local Scraper

Local Playwright-based scraper that runs on your machine and sends data to the Vercel-hosted dashboard.

## Features

🤖 **Full Browser Automation** - Real Chromium browser with JavaScript support
📄 **Complete Data Extraction** - Decedent, petitioner, executor, case details  
🏠 **Property Data** - Follows QPublic links for parcel information
💾 **Local Storage** - Saves HTML/PDF files with timestamps
📤 **Auto Upload** - Sends normalized data to Vercel API
⏱️ **Polite Scraping** - 15-30 second delays between requests
🛡️ **CAPTCHA Detection** - Stops gracefully when blocked

## Quick Start

1. **Install dependencies:**
   ```bash
   cd local-scraper
   npm run install-deps
   npx playwright install chromium
   ```

2. **Set up environment (optional):**
   ```bash
   echo "VERCEL_URL=https://georgia-probate-monitor.vercel.app" > .env
   echo "API_KEY=your-secret-key" >> .env
   ```

3. **Run scraper:**
   ```bash
   # Scrape Georgia Probate Records (default)
   npm run scrape

   # Scrape specific site
   npm run scrape:georgia
   npm run scrape:cobb

   # Scrape all sites
   npm run scrape:all
   ```

## Usage

**Basic scraping:**
```bash
npm run scrape
```

**Command line arguments:**
```bash
tsx scrape-runner.ts georgia_probate_records
tsx scrape-runner.ts cobb_probate  
tsx scrape-runner.ts georgia_probate_records cobb_probate
```

## What It Does

1. **Opens browser** - Launches Chromium with full JavaScript support
2. **Navigates to site** - Goes to probate records website
3. **Accepts terms** - Automatically clicks "Accept" on any modals
4. **Searches by date** - Looks for today's filings (or custom date range)
5. **Extracts results** - Gets case list from search results
6. **Opens details** - Clicks on each case for full information
7. **Follows property links** - Gets parcel data from QPublic
8. **Saves locally** - HTML/PDF files saved to `./scraped-data/`
9. **Uploads to Vercel** - Sends normalized JSON to your dashboard
10. **Polite delays** - Waits 15-30 seconds between requests

## File Output

Local files saved in `./scraped-data/`:
- `georgia-search-{timestamp}.html` - Search results page
- `case-{caseNumber}-{timestamp}.html` - Individual case details  
- `case-{caseNumber}-{timestamp}.pdf` - Case details as PDF

## Dashboard Integration

Data is automatically sent to your Vercel dashboard at:
`/api/cases-bulk` endpoint

View results at: https://georgia-probate-monitor.vercel.app

## Scheduling

Set up daily scraping with cron:

```bash
# Run every day at 9 AM
0 9 * * * cd /path/to/local-scraper && npm run scrape

# Run every 4 hours
0 */4 * * * cd /path/to/local-scraper && npm run scrape:all
```

## Troubleshooting

**Browser issues:**
```bash
npx playwright install chromium
```

**Permission errors:**
```bash
chmod +x scrape-runner.ts
```

**API upload fails:**
- Check VERCEL_URL in .env
- Verify Vercel app is running
- Check network connectivity

## Architecture

```
Local Machine                    Vercel Cloud
┌─────────────────┐             ┌──────────────────┐
│ Playwright      │   POST      │ /api/cases-bulk  │
│ Browser         │ ─────────── │ (receives data)  │
│ HTML/PDF        │   JSON      │                  │
│ Storage         │             │ Dashboard UI     │
└─────────────────┘             └──────────────────┘
```

This gives you the best of both worlds:
- Full browser capabilities locally
- Cloud dashboard for viewing data
- No Vercel serverless limitations