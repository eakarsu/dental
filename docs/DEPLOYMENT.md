#   Deployment Guide

This guide covers deploying the Dental Clinic SaaS platform to production.

## Quick Start - Vercel Deployment (Recommended)

### Prerequisites
- GitHub/GitLab account
- Vercel account (free tier available)
- PostgreSQL database (Neon, Supabase, or Railway)

### Step 1: Prepare Your Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Dental SaaS Platform"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/dental-saas.git
git push -u origin main
```

### Step 2: Set Up Database

**Option A: Neon (Recommended for Vercel)**

1. Go to https://neon.tech
2. Create account and new project
3. Copy connection string
4. It will look like: `postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/dental_saas?sslmode=require`

**Option B: Supabase**

1. Go to https://supabase.com
2. Create new project
3. Go to Settings > Database
4. Copy connection string (Direct connection)

**Option C: Railway**

1. Go to https://railway.app
2. Create new project > PostgreSQL
3. Copy connection string from Variables tab

### Step 3: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

**Or use Vercel Dashboard:**

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

### Step 4: Configure Environment Variables

In Vercel Dashboard (Settings > Environment Variables):

```env
DATABASE_URL=postgresql://user:password@host:port/dental_saas?sslmode=require
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-generated-secret-here
NODE_ENV=production
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Step 5: Run Database Migrations

After deploying, run migrations:

**Option A: Using Vercel CLI**
```bash
vercel env pull .env.production
npm run db:push
npm run db:seed
```

**Option B: Using Prisma Data Platform**
```bash
# Enable Prisma Migrate in production
npx prisma migrate deploy
```

**Option C: Using Neon/Supabase Dashboard**
1. Connect to your database
2. Run the Prisma SQL dump manually

### Step 6: Verify Deployment

1. Visit your Vercel URL
2. Login with seeded credentials
3. Test core functionality

---

## Alternative Deployment Options

## Docker Deployment

### Create Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dental_saas
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/dental_saas
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: your-secret-here
    depends_on:
      - db

volumes:
  postgres_data:
```

### Deploy with Docker

```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma db push
docker-compose exec app npm run db:seed

# View logs
docker-compose logs -f app
```

---

## AWS Deployment (EC2 + RDS)

### Step 1: Set Up RDS PostgreSQL

1. Go to AWS RDS Console
2. Create PostgreSQL database
3. Configure security groups
4. Note connection details

### Step 2: Launch EC2 Instance

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-username/dental-saas.git
cd dental-saas

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables

# Build application
npm run build

# Run migrations
npm run db:push
npm run db:seed

# Start with PM2
pm2 start npm --name "dental-saas" -- start
pm2 save
pm2 startup
```

### Step 3: Configure Nginx

```bash
# Install Nginx
sudo yum install -y nginx

# Configure Nginx
sudo nano /etc/nginx/conf.d/dental-saas.conf
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 4: Set Up SSL with Certbot

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Digital Ocean Deployment

### Using App Platform

1. Go to Digital Ocean App Platform
2. Connect GitHub repository
3. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
4. Add PostgreSQL database
5. Set environment variables
6. Deploy!

### Using Droplet

Similar to AWS EC2 deployment above.

---

## Environment Variables Reference

### Required Variables

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Node Environment
NODE_ENV=production
```

### Optional Variables

```env
# Email Service (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=dental-saas-uploads
AWS_REGION=us-east-1

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## Database Migration Strategies

### Development to Production

**Option 1: Prisma Migrate (Recommended)**

```bash
# Create migration
npx prisma migrate dev --name initial_migration

# Deploy to production
npx prisma migrate deploy
```

**Option 2: Prisma DB Push (Quick)**

```bash
npx prisma db push
```

**Option 3: SQL Dump**

```bash
# Export from dev
pg_dump dental_saas > backup.sql

# Import to production
psql -h production-host -U user -d dental_saas < backup.sql
```

---

## Performance Optimization

### 1. Enable Caching

In `next.config.ts`:
```typescript
const nextConfig = {
  compress: true,
  images: {
    domains: ['your-cdn.com'],
  },
  // Enable SWC minification
  swcMinify: true,
}
```

### 2. Database Connection Pooling

Use PgBouncer or Prisma Accelerate:

```bash
# Prisma Accelerate
npm install @prisma/extension-accelerate

# Update schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

### 3. CDN for Static Assets

Upload to Vercel/Cloudflare/AWS CloudFront.

---

## Monitoring & Logging

### Set Up Error Tracking

**Option A: Sentry**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Option B: LogRocket**

```bash
npm install logrocket
```

### Set Up Uptime Monitoring

- UptimeRobot (free)
- Pingdom
- AWS CloudWatch

---

## Backup Strategy

### Database Backups

**Automated Backups:**

```bash
# Cron job for daily backups
0 2 * * * pg_dump -h host -U user dental_saas > /backups/dental_saas_$(date +\%Y\%m\%d).sql
```

**Cloud Provider Backups:**
- Neon: Automatic point-in-time recovery
- Supabase: Daily backups
- AWS RDS: Automated backups with retention

### Application Backups

Use Git tags for releases:
```bash
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0
```

---

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured (not in code)
- [ ] Database connections use SSL
- [ ] Strong NEXTAUTH_SECRET generated
- [ ] CORS configured properly
- [ ] Rate limiting implemented (if needed)
- [ ] Database backups scheduled
- [ ] Error logging configured
- [ ] Security headers configured
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS prevention (Zod validation)

---

## Troubleshooting

### Build Failures

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Check SSL requirements
# Add ?sslmode=require to DATABASE_URL
```

### Memory Issues

Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## Post-Deployment Checklist

- [ ] Application accessible at domain
- [ ] Login functionality works
- [ ] Database seeded with initial data
- [ ] HTTPS/SSL working
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] Error tracking enabled
- [ ] Performance tested
- [ ] Mobile responsiveness verified
- [ ] Email notifications working (if configured)

---

## Scaling Considerations

### Horizontal Scaling

- Deploy to multiple regions (Vercel Edge)
- Use CDN for static assets
- Implement Redis for session storage
- Use database read replicas

### Vertical Scaling

- Upgrade database instance
- Increase server resources
- Enable connection pooling

---

## Cost Estimation

### Vercel Free Tier
- **Hosting**: Free for hobby projects
- **Bandwidth**: 100GB/month
- **Builds**: Unlimited
- **Database**: Requires external provider

### Production Estimate (Monthly)
- **Hosting** (Vercel Pro): $20
- **Database** (Neon Scale): $19
- **Total**: ~$40/month

### Enterprise Estimate
- **Hosting** (Vercel Enterprise): $150+
- **Database** (AWS RDS): $50-200
- **Total**: $200-350/month

---

## Support & Maintenance

### Regular Maintenance Tasks

- Weekly: Check error logs
- Monthly: Review database performance
- Quarterly: Update dependencies
- Annually: Security audit

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update packages
npm update

# Update Prisma
npx prisma generate
```

---

For additional help, consult:
- Next.js deployment docs: https://nextjs.org/docs/deployment
- Prisma deployment guide: https://www.prisma.io/docs/guides/deployment
- Vercel documentation: https://vercel.com/docs
