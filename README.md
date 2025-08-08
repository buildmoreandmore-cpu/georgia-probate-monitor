# Georgia Probate Monitor

A production-ready web application for monitoring Georgia probate filings, extracting case data, matching properties via QPublic, standardizing addresses for deliverability, and outputting contact-ready records in strict JSON schema.

## Features

- **Automated Probate Scraping**: Monitors Georgia probate courts and extracts case data
- **Property Matching**: Links probate cases to QPublic property records across 7 Georgia counties
- **Address Standardization**: Normalizes addresses with provider interface (UPS/USPS/Free)
- **Phone Enrichment**: Enriches contacts with phone numbers via CSV upload or API providers
- **Data Export**: Exports cases in strict JSON schema format or CSV
- **Admin Dashboard**: Clean UI for managing cases, settings, and monitoring scraping jobs
- **Rate Limiting**: Built-in IP-based rate limiting with configurable limits
- **Docker Support**: One-command setup with Docker Compose

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI**: Tailwind CSS with custom components
- **Database**: SQLite with Prisma ORM
- **Scraping**: Playwright with retry logic and user-agent rotation
- **Validation**: Zod for all inputs/outputs
- **Containerization**: Docker with multi-stage builds

## Quick Start

### Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd georgia-probate-monitor
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the application:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

### Option 2: Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Initialize the database:
```bash
npm run db:push
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required
- `DATABASE_URL`: SQLite database path (default: `file:./dev.db`)

#### Address Standardization (Optional)
- `ADDRESS_PROVIDER`: `free|ups|usps` (default: `free`)
- `UPS_API_KEY`, `UPS_USER_ID`, `UPS_PASSWORD`: UPS API credentials
- `USPS_USER_ID`: USPS API credential

#### Phone Enrichment (Optional)
- `PHONE_PROVIDER`: `csv|truecaller|whitepages` (default: `csv`)
- `TRUECALLER_API_KEY`, `WHITEPAGES_API_KEY`: API credentials

#### Scraping Configuration
- `RATE_LIMIT_REQUESTS_PER_MINUTE`: API rate limit (default: `60`)
- `SCRAPE_DELAY_MS`: Delay between requests (default: `2000`)
- `ENABLED_COUNTIES`: Counties to monitor (default: `cobb,dekalb,fulton`)

### Application Settings

Configure via the Settings page in the UI:
- Service provider selection
- Rate limits and delays
- County selection
- Cron schedules
- CSV phone data upload

## Data Sources

### Probate Courts
- **Georgia Probate Records**: `https://georgiaprobaterecords.com/Estates/SearchEstates.aspx`
- **Cobb Probate Court**: `https://probateonline.cobbcounty.org/BenchmarkWeb/Home.aspx/Search`

### Property Records (QPublic)
- **Cobb**: Schneider QPublic portal
- **DeKalb**: Schneider QPublic portal  
- **Fulton**: Schneider QPublic portal
- **Fayette**: Schneider QPublic portal
- **Newton**: Schneider QPublic portal
- **Douglas**: Schneider QPublic portal
- **Gwinnett**: Schneider QPublic portal

## Usage

### Dashboard
- View scraping statistics and recent jobs
- Manually trigger scraping jobs
- Monitor system health

### Cases
- Browse and filter probate cases
- Sort by filing date, county, estate value
- Select multiple cases for bulk export
- Export to JSON (strict schema) or CSV format

### Case Details
- View complete case information
- See linked contacts with phone numbers and deliverability status
- Review matched properties with confidence scores
- Add case notes and change status
- Export individual cases
- Copy strict JSON schema to clipboard

### Settings
- Configure service providers (address, phone)
- Set rate limits and scraping delays
- Upload phone data via CSV
- Schedule automatic scraping

## JSON Output Schema

The application outputs data in this strict format:

```json
{
  "case_id": "string",
  "county": "string", 
  "filing_date": "ISO date",
  "decedent": {
    "name": "string",
    "address": "string"
  },
  "estate_value": "number|null",
  "contacts": [
    {
      "type": "executor|administrator|petitioner", 
      "name": "string",
      "original_address": "string",
      "standardized_address": "string", 
      "ups_deliverable": "boolean",
      "phone": "string|null",
      "phone_source": "csv|provider|null"
    }
  ],
  "parcels": [
    {
      "parcel_id": "string",
      "county": "string", 
      "situs_address": "string",
      "tax_mailing_address": "string",
      "current_owner": "string",
      "last_sale_date": "ISO date|null",
      "assessed_value": "number|null",
      "qpublic_url": "string"
    }
  ]
}
```

## API Endpoints

### Cases
- `GET /api/cases` - List cases with pagination and filtering
- `GET /api/cases/[id]` - Get case details
- `PATCH /api/cases/[id]` - Update case notes/status
- `POST /api/cases/export` - Export cases (JSON/CSV)

### Scraping
- `POST /api/scrape` - Start scraping job
- `GET /api/scrape` - Get scraping job history

### Phone Data
- `POST /api/phone/upload` - Upload phone CSV
- `GET /api/phone/upload` - Get upload history

### Settings
- `GET /api/settings` - Get configuration
- `PATCH /api/settings` - Update configuration

## Development

### Database Management
```bash
npm run db:push      # Apply schema changes
npm run db:seed      # Seed with sample data  
npm run db:studio    # Open Prisma Studio
```

### Code Quality
```bash
npm run lint         # ESLint check
npm run format       # Prettier formatting
npm run type-check   # TypeScript check
```

### Testing
The application includes comprehensive error handling and validation:
- All API inputs validated with Zod schemas
- Rate limiting on all endpoints
- Retry logic for scraping operations
- Graceful fallbacks for service failures

## Production Deployment

### Docker Production
```bash
docker-compose -f docker-compose.yml up -d
```

### Manual Production Setup
1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Initialize production database:
```bash
npm run db:push
npm run db:seed
```

4. Start the server:
```bash
npm start
```

## Architecture

### Core Workflow
1. **Probate Ingestion**: Scrape recent estates/petitions from court sources
2. **Property Matching**: Query relevant county QPublic systems for each address/name
3. **Data Linking**: Match people to properties using fuzzy name/address matching
4. **Address Standardization**: Normalize addresses to USPS format with deliverability flags
5. **Contact Enrichment**: Append phone numbers via provider interface or CSV data

### Key Services
- **Scrapers**: Playwright-based scrapers for each court system
- **Property Service**: QPublic integration for all supported counties  
- **Address Service**: Provider interface with UPS/USPS/free fallback
- **Phone Service**: CSV upload + API provider integration
- **Data Matcher**: Fuzzy matching logic with confidence scoring

## Legal & Ethics

This application is designed for legitimate business purposes:
- Respects robots.txt and Terms of Service
- Implements rate limiting and delays
- Uses rotating user agents
- Focuses on publicly available court records
- Supports defensive security analysis only

## Support

For issues or questions:
- Check the troubleshooting section in this README
- Review error logs in the dashboard
- Verify configuration in the Settings page
- Ensure proper environment variables are set

## License

[Add your license here]