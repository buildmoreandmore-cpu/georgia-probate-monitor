# Vercel Deployment Guide

## Important Considerations

⚠️ **Serverless Limitations**: This application was originally designed for Docker deployment with full Playwright scraping capabilities. Vercel's serverless environment has limitations:

- **No Playwright**: Browser automation doesn't work in serverless functions
- **Ephemeral Storage**: SQLite database is recreated on each deployment
- **Function Timeouts**: Limited execution time for scraping operations
- **Memory Constraints**: Limited resources for complex operations

## Deployment Options

### Option 1: Vercel (Demo/Development)
Best for: Demonstrating the UI and basic functionality

### Option 2: Docker (Recommended for Production)  
Best for: Full scraping capabilities and persistent data storage

## Vercel Deployment Steps

### 1. Prepare for Deployment

```bash
# Navigate to project directory
cd georgia-probate-monitor

# Initialize git repository
git init
git add .
git commit -m "Initial commit: Georgia Probate Monitor"

# Create GitHub repository and push
# (Replace with your GitHub username and repo name)
git remote add origin https://github.com/yourusername/georgia-probate-monitor.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
# Enter: file:./tmp/database.db

vercel env add ADDRESS_PROVIDER  
# Enter: free

vercel env add PHONE_PROVIDER
# Enter: csv

vercel env add RATE_LIMIT_REQUESTS_PER_MINUTE
# Enter: 30
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Import the `georgia-probate-monitor` project
4. Configure environment variables in the dashboard:
   - `DATABASE_URL`: `file:./tmp/database.db`
   - `ADDRESS_PROVIDER`: `free`
   - `PHONE_PROVIDER`: `csv`
   - `RATE_LIMIT_REQUESTS_PER_MINUTE`: `30`
   - `ENABLED_COUNTIES`: `cobb,dekalb,fulton`
5. Deploy

### 3. Post-Deployment

The Vercel version will have:
- ✅ Full admin UI functionality
- ✅ Case browsing and management
- ✅ Settings configuration
- ✅ CSV export capabilities
- ✅ Phone data upload
- ⚠️ **Limited scraping** (demo data only)
- ⚠️ **Ephemeral database** (resets on redeploy)

## Vercel-Specific Features

### Demo Data
The Vercel deployment includes sample probate case data to demonstrate the application's capabilities without requiring actual web scraping.

### Simplified Scraping
Instead of Playwright web scraping, the Vercel version returns structured demo data that follows the same schema as real scraped data.

### In-Memory Database
SQLite runs in temporary storage, so data doesn't persist between deployments. For production use with persistent data, use the Docker deployment.

## Environment Variables for Vercel

Set these in your Vercel dashboard:

```env
DATABASE_URL="file:./tmp/database.db"
ADDRESS_PROVIDER="free"
PHONE_PROVIDER="csv"
RATE_LIMIT_REQUESTS_PER_MINUTE="30"
SCRAPE_DELAY_MS="3000"
ENABLED_COUNTIES="cobb,dekalb,fulton"
NODE_ENV="production"
```

## Limitations in Vercel Deployment

1. **No Real Scraping**: Playwright doesn't work in serverless
2. **Data Loss**: Database resets on each deployment
3. **Function Timeouts**: 10-60 second limits (depending on plan)
4. **Memory Limits**: Limited resources for complex operations
5. **Cold Starts**: First requests may be slow

## Full Production Deployment (Recommended)

For a production system with full scraping capabilities:

```bash
# Use Docker deployment instead
docker-compose up -d
```

This provides:
- ✅ Full Playwright scraping
- ✅ Persistent SQLite database
- ✅ All counties supported
- ✅ Unlimited execution time
- ✅ Full memory and CPU resources

## Troubleshooting Vercel Deployment

### Build Failures
- Ensure all dependencies are in `package.json`
- Check that Prisma generates properly
- Verify environment variables are set

### Runtime Errors
- Check Vercel function logs
- Ensure database directory is created
- Verify file permissions

### Database Issues
- Database resets on each deployment (expected in serverless)
- Use environment variables for configuration
- Check that schema is applied correctly

## Support

The Vercel deployment is intended for demonstration purposes. For production use with full scraping capabilities, please use the Docker deployment method described in the main README.