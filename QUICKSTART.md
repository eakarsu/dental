# Quick Start Guide

Get the Dental Clinic SaaS up and running in minutes!

## Prerequisites

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be v18 or higher
   ```

2. **PostgreSQL** installed and running
   ```bash
   # macOS (Homebrew)
   brew install postgresql@15
   brew services start postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql
   sudo systemctl start postgresql

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

## Option 1: Automated Setup (Recommended)

Just run the start script:

```bash
./start.sh
```

The script will:
- ✅ Check Node.js and PostgreSQL
- ✅ Kill any process on port 3000
- ✅ Create .env file if missing
- ✅ Install all dependencies
- ✅ Generate Prisma Client
- ✅ Set up the database
- ✅ Seed with sample data
- ✅ Start the development server

Then open http://localhost:3000 and login!

## Option 2: Manual Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env and update DATABASE_URL with your PostgreSQL credentials
# Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/dental_saas"
nano .env
```

### Step 3: Setup Database
```bash
# Create database (if not exists)
createdb dental_saas

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### Step 4: Start Application
```bash
npm run dev
```

Visit http://localhost:3000

## Demo Credentials

After seeding, login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@dentalclinic.com | password123 |
| **Dentist** | dr.smith@dentalclinic.com | password123 |
| **Dentist** | dr.williams@dentalclinic.com | password123 |
| **Receptionist** | receptionist@dentalclinic.com | password123 |
| **Hygienist** | hygienist@dentalclinic.com | password123 |

## Troubleshooting

### Port 3000 Already in Use

**Option A: Use the start script**
```bash
./start.sh
# It will automatically kill the process
```

**Option B: Manual kill**
```bash
# Find process ID
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Database Connection Error

1. **Check PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   sudo systemctl status postgresql

   # Test connection
   psql -U postgres -c "SELECT 1"
   ```

2. **Verify DATABASE_URL in .env**:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   ```

3. **Check database exists**:
   ```bash
   psql -U postgres -l | grep dental_saas
   ```

4. **Create database if missing**:
   ```bash
   createdb dental_saas
   ```

### Dependencies Installation Issues

```bash
# Clear npm cache
rm -rf node_modules package-lock.json
npm cache clean --force

# Reinstall
npm install
```

### Prisma Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or manually:
dropdb dental_saas && createdb dental_saas
npm run db:push
npm run db:seed
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:seed          # Seed with sample data
npm run db:studio        # Open Prisma Studio (GUI)

# Testing
npx playwright test      # Run E2E tests
npx playwright test --ui # Run tests in UI mode

# Utilities
./start.sh              # Automated setup and start
```

## Opening Prisma Studio

To view and edit database records with a GUI:

```bash
npm run db:studio
```

Opens at http://localhost:5555

## Next Steps

1. **Explore the Dashboard**: See overview statistics
2. **Add a Patient**: Click Patients → Add Patient
3. **Schedule Appointment**: Use the calendar to create appointments
4. **Create Treatment Plan**: Track procedures with checklists
5. **Submit Insurance Claim**: Manage billing and claims
6. **Review Documentation**: Check README.md, DEMO_SCRIPT.md, PROJECT_SUMMARY.md

## Common First-Time Setup

### For Development

```bash
# 1. Clone/navigate to project
cd dental-saas

# 2. Run automated setup
./start.sh

# 3. When prompted:
#    - Press N for database reset (if first time, say Y)
#    - Press N for production build

# 4. Access at http://localhost:3000
```

### For Production Deployment

See `DEPLOYMENT.md` for detailed production setup.

Quick Vercel deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Deploy to production
vercel --prod
```

## Health Check

Verify everything is working:

1. **Application Running**: http://localhost:3000 → Should redirect to login
2. **Login Works**: Use admin@dentalclinic.com / password123
3. **Dashboard Loads**: See statistics and charts
4. **API Working**: Network tab shows successful API calls
5. **Database Connected**: Can view patients, appointments

## Environment Variables Explained

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
# Example: postgresql://postgres:mypassword@localhost:5432/dental_saas

# Application URL (change for production)
NEXTAUTH_URL="http://localhost:3000"

# Secret key for JWT tokens (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"

# Environment mode
NODE_ENV="development"  # or "production"
```

## Sample Data Overview

After seeding, you'll have:

- **5 Users**: 1 admin, 2 dentists, 1 receptionist, 1 hygienist
- **5 Patients**: With complete profiles and medical history
- **5 Appointments**: Various types and statuses
- **4 Treatments**: Including treatment plans with checklists
- **3 Insurance Claims**: Different claim statuses
- **2 Reminders**: Sample notification data

All with realistic relationships and data.

## Development Workflow

```bash
# 1. Start the app
./start.sh

# 2. Make code changes
# Files auto-reload on save

# 3. Database changes
# Edit prisma/schema.prisma
npm run db:push
npm run db:generate

# 4. Test changes
# Browse to localhost:3000
# Or run tests: npx playwright test

# 5. Commit changes
git add .
git commit -m "Description of changes"
```

## Getting Help

1. **README.md**: Full setup and configuration guide
2. **DEPLOYMENT.md**: Production deployment guide
3. **DEMO_SCRIPT.md**: Feature walkthrough and demo
4. **PROJECT_SUMMARY.md**: Technical overview
5. **Code Comments**: Inline documentation

## Success Checklist

After running start.sh, verify:

- [ ] No errors in console
- [ ] Can access http://localhost:3000
- [ ] Redirects to /login
- [ ] Can login with demo credentials
- [ ] Dashboard shows statistics
- [ ] Can navigate to Patients page
- [ ] Can navigate to Appointments calendar
- [ ] Can create new patient
- [ ] Database contains seeded data

If all checked, you're ready to go! 🎉

---

**Need help?** Check the troubleshooting section above or review the full README.md
