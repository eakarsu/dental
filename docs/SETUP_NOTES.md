# Setup Notes - Important Information

## Prisma 7 Database Adapters

This project uses **Prisma 7**, which requires database adapter drivers for connections.

### What This Means

The application automatically detects your database type and uses the appropriate adapter:

- **Local PostgreSQL**: Uses `@prisma/adapter-pg` with the `pg` driver
- **Neon Database**: Uses `@prisma/adapter-neon` with Neon's serverless driver

### Dependencies Included

The following adapter packages are already installed:

```json
{
  "pg": "^8.x",                           // PostgreSQL driver
  "@prisma/adapter-pg": "^7.0.0",        // Prisma adapter for pg
  "@neondatabase/serverless": "^0.x",     // Neon serverless driver
  "@prisma/adapter-neon": "^7.0.0"       // Prisma adapter for Neon
}
```

### How It Works

The `lib/prisma.ts` file automatically:

1. Detects if you're using Neon (by checking for "neon.tech" or "pooler" in DATABASE_URL)
2. Uses the appropriate adapter based on your database
3. Falls back to pg adapter for local/traditional PostgreSQL

### No Action Required

You don't need to do anything special! Just:

1. Set your `DATABASE_URL` in `.env`
2. Run `npm run db:push` or `npm run db:migrate`
3. Start the application

The correct adapter will be used automatically.

### For Local Development

Your `.env` should have:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dental_saas?schema=public"
```

This will use the **pg adapter**.

### For Neon/Serverless

Your `.env` would have:

```env
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/dental_saas?sslmode=require"
```

This will use the **Neon adapter**.

## Running the Application

### Quick Start

```bash
./start.sh
```

This script will:
- Check dependencies
- Kill any process on port 3000
- Set up environment
- Install packages
- Generate Prisma Client
- Set up database
- Start the server

### Manual Start

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database
npm run db:seed

# Start development server
npm run dev
```

## Common Issues & Solutions

### Issue: "requires either 'adapter' or 'accelerateUrl'"

**Solution**: This is expected with Prisma 7. The `lib/prisma.ts` file handles this automatically by detecting your database type and using the appropriate adapter.

If you see this error, make sure:
1. `DATABASE_URL` is set in `.env`
2. Dependencies are installed: `npm install`
3. Prisma Client is generated: `npm run db:generate`

### Issue: Database Connection Errors

**Check PostgreSQL is Running**:

```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Test connection
psql -U postgres -c "SELECT 1"
```

**Verify DATABASE_URL**:

```bash
# Print your DATABASE_URL (sanitized)
echo $DATABASE_URL | sed 's/:[^@]*@/:****@/'
```

### Issue: Port 3000 Already in Use

**Use the start script**:
```bash
./start.sh  # Automatically handles this
```

**Or manually**:
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

### Issue: Prisma Generate Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npx prisma generate
```

## Database Setup for First-Time Users

### Create Database

```bash
# Using createdb (if available)
createdb dental_saas

# Or using psql
psql -U postgres -c "CREATE DATABASE dental_saas;"
```

### Verify Database Exists

```bash
psql -U postgres -l | grep dental_saas
```

### Push Schema

```bash
npm run db:push
```

### Seed Data

```bash
npm run db:seed
```

## Environment Variables

### Required

```env
# PostgreSQL Connection (adapt to your setup)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Environment
NODE_ENV="development"
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Development Workflow

### Making Database Changes

1. **Edit Schema**:
   ```bash
   # Edit prisma/schema.prisma
   code prisma/schema.prisma
   ```

2. **Push Changes**:
   ```bash
   npm run db:push
   ```

3. **Regenerate Client**:
   ```bash
   npm run db:generate
   ```

4. **Update Types** (automatic with TypeScript):
   - Your IDE will show updated Prisma types

### Adding New Features

1. Update database schema if needed
2. Create/update API routes in `app/api/`
3. Create/update UI components in `app/dashboard/`
4. Test with `npm run dev`
5. Run E2E tests: `npx playwright test`

## Testing

### Run E2E Tests

```bash
# Run all tests
npx playwright test

# Run in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/auth.spec.ts
```

### View Test Report

```bash
npx playwright show-report
```

## Deployment Preparation

### For Vercel

1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### For Docker

```bash
# Build image
docker build -t dental-saas .

# Run container
docker run -p 3000:3000 dental-saas
```

See `DEPLOYMENT.md` for complete deployment instructions.

## Database Tools

### Prisma Studio

Visual database editor:

```bash
npm run db:studio
```

Opens at http://localhost:5555

### View Schema

```bash
npx prisma db pull
```

### Reset Database

```bash
# WARNING: Deletes all data
npx prisma migrate reset
```

## Package Scripts Reference

```json
{
  "dev": "next dev",                    // Start development server
  "build": "next build",                // Build for production
  "start": "next start",                // Start production server
  "lint": "eslint",                     // Run linter
  "db:generate": "prisma generate",     // Generate Prisma Client
  "db:push": "prisma db push",          // Push schema to DB
  "db:migrate": "prisma migrate dev",   // Create migration
  "db:seed": "tsx prisma/seed.ts",      // Seed database
  "db:studio": "prisma studio"          // Open Prisma Studio
}
```

## File Locations

### Configuration Files

- `.env` - Environment variables
- `prisma/schema.prisma` - Database schema
- `prisma.config.ts` - Prisma configuration
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration

### Source Code

- `app/` - Next.js application
  - `app/api/` - Backend API routes
  - `app/dashboard/` - Dashboard pages
  - `app/login/` - Login page
- `lib/` - Utility functions
  - `lib/prisma.ts` - **Database client** (includes adapter logic)
  - `lib/auth.ts` - Authentication
  - `lib/theme.ts` - Material UI theme
- `prisma/` - Database
  - `prisma/schema.prisma` - Schema definition
  - `prisma/seed.ts` - Seed data

## Getting Help

1. **Check Documentation**:
   - `QUICKSTART.md` - Quick setup guide
   - `README.md` - Full documentation
   - `DEPLOYMENT.md` - Deployment guide
   - `INDEX.md` - Documentation index

2. **Common Issues**:
   - Port 3000 in use → Run `./start.sh`
   - Database connection → Check PostgreSQL running
   - Prisma errors → Run `npm run db:generate`

3. **External Resources**:
   - [Prisma 7 Docs](https://www.prisma.io/docs)
   - [Next.js Docs](https://nextjs.org/docs)
   - [Material-UI Docs](https://mui.com)

## Quick Reference

### Start Application

```bash
./start.sh
```

### Stop Application

```
Ctrl + C
```

### Reset Everything

```bash
# Kill port 3000
lsof -ti:3000 | xargs kill -9

# Clean install
rm -rf node_modules .next
npm install

# Reset database
dropdb dental_saas && createdb dental_saas
npm run db:push
npm run db:seed

# Start fresh
npm run dev
```

### Access Points

- **Application**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555 (run `npm run db:studio`)
- **Login**: admin@dentalclinic.com / password123

## Next Steps

After setup:

1. Login to the application
2. Explore the dashboard
3. Try creating a patient
4. Schedule an appointment
5. Review the code structure
6. Read `DEMO_SCRIPT.md` for feature walkthrough

---

**Ready to start? Run `./start.sh` and go!**
