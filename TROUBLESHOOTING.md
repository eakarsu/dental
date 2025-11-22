# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Edge runtime does not support Node.js 'crypto' module"

**Problem**: This error occurs when Node.js modules are imported in Edge runtime (middleware).

**Solution**: Already fixed in this project! The middleware uses cookie-based authentication check instead of importing server modules.

**Files affected**:
- `middleware.ts` - Uses simple cookie check (Edge-compatible)
- `lib/auth.ts` - Marked as `server-only`
- `lib/prisma.ts` - Marked as `server-only`

### 2. "Requires either 'adapter' or 'accelerateUrl' to PrismaClient"

**Problem**: Prisma 7 requires database adapters.

**Solution**: Already configured! The `lib/prisma.ts` file automatically uses the correct adapter:
- **Local PostgreSQL**: Uses `@prisma/adapter-pg`
- **Neon Database**: Uses `@prisma/adapter-neon`

No configuration needed - just set `DATABASE_URL` in `.env`.

### 3. Port 3000 Already in Use

**Problem**: Another process is using port 3000.

**Solution A - Use start script**:
```bash
./start.sh  # Automatically kills the process
```

**Solution B - Manual**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or on Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 4. Database Connection Errors

**Problem**: Cannot connect to PostgreSQL database.

**Checklist**:

1. **PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   sudo systemctl status postgresql

   # Test connection
   psql -U postgres -c "SELECT 1"
   ```

2. **DATABASE_URL is correct**:
   ```env
   # Format
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

   # Example
   DATABASE_URL="postgresql://postgres:password@localhost:5432/dental_saas"
   ```

3. **Database exists**:
   ```bash
   # Check
   psql -U postgres -l | grep dental_saas

   # Create if missing
   createdb dental_saas
   ```

4. **Push schema**:
   ```bash
   npm run db:push
   ```

### 5. Prisma Generate Errors

**Problem**: `npx prisma generate` fails.

**Solution**:
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate
npx prisma generate
```

### 6. Build Failures

**Problem**: `npm run build` fails.

**Solutions**:

**Clear cache**:
```bash
rm -rf .next
npm run build
```

**Memory issues**:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Check for errors**:
```bash
# Run TypeScript check
npx tsc --noEmit

# Run linter
npm run lint
```

### 7. Module Not Found Errors

**Problem**: Cannot find module '@/...' or similar.

**Solution**:
```bash
# Reinstall dependencies
npm install

# Check tsconfig.json paths are correct
cat tsconfig.json | grep -A 5 "paths"
```

### 8. Session/Auth Not Working

**Problem**: Login doesn't persist or redirects incorrectly.

**Checklist**:

1. **NEXTAUTH_SECRET is set**:
   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Add to .env
   NEXTAUTH_SECRET="<generated-secret>"
   ```

2. **NEXTAUTH_URL is correct**:
   ```env
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Cookies are enabled** in browser

4. **Check middleware**:
   - Should be checking for session tokens
   - Public paths should include `/login` and `/api/auth`

### 9. Database Schema Out of Sync

**Problem**: Database schema doesn't match Prisma schema.

**Solution**:
```bash
# Option 1: Push schema (development)
npm run db:push

# Option 2: Create migration (production)
npx prisma migrate dev --name <migration_name>

# Option 3: Reset database (WARNING: Deletes data)
npx prisma migrate reset
```

### 10. Seed Script Fails

**Problem**: `npm run db:seed` fails.

**Solutions**:

**Database connection**:
```bash
# Test connection first
npx prisma db pull
```

**Duplicate data**:
```bash
# Reset and re-seed
npx prisma migrate reset
npm run db:seed
```

**Check Prisma Client**:
```bash
npm run db:generate
```

### 11. TypeScript Errors

**Problem**: Type errors in IDE or during build.

**Solutions**:

**Regenerate types**:
```bash
npm run db:generate
```

**Restart TypeScript server** (VS Code):
- Cmd/Ctrl + Shift + P
- "TypeScript: Restart TS Server"

**Check tsconfig.json**:
```bash
cat tsconfig.json
```

### 12. Deployment Issues

#### Vercel Deployment

**Build fails**:
- Check environment variables are set
- Ensure DATABASE_URL uses production database
- Set NEXTAUTH_SECRET

**Database connection timeout**:
- Use connection pooling (Neon, Supabase)
- Check database is accessible from Vercel

#### Docker Deployment

**Build fails**:
```bash
# Clear Docker cache
docker build --no-cache -t dental-saas .
```

**Database connection**:
- Use `host.docker.internal` for local database
- Or link containers with docker-compose

### 13. Performance Issues

**Slow API responses**:
- Add database indexes (already included)
- Enable connection pooling
- Use `npm run build` for production

**Large bundle size**:
```bash
# Analyze bundle
npm run build
# Check .next/analyze/
```

**Memory leaks**:
- Check for unclosed database connections
- Prisma Client is singleton (already handled)

### 14. Testing Issues

**Playwright tests fail**:

**Install browsers**:
```bash
npx playwright install
```

**Port in use**:
```bash
# Kill process on 3000
lsof -ti:3000 | xargs kill -9
```

**Update config**:
```bash
# Check playwright.config.ts
cat playwright.config.ts
```

### 15. Development Server Issues

**Hot reload not working**:
```bash
# Restart dev server
# Kill process
lsof -ti:3000 | xargs kill -9

# Restart
npm run dev
```

**Changes not reflected**:
```bash
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

## Debug Commands

### Check Everything

```bash
# Node version (should be 18+)
node --version

# PostgreSQL version
psql --version

# Check if PostgreSQL is running
pg_isready

# Test database connection
psql -U postgres -d dental_saas -c "SELECT 1"

# Check environment variables
cat .env

# Check if port 3000 is free
lsof -i:3000

# Check Prisma Client
npx prisma --version
```

### Reset Everything

```bash
# WARNING: This deletes all data!

# 1. Kill server
lsof -ti:3000 | xargs kill -9

# 2. Clean npm
rm -rf node_modules package-lock.json .next

# 3. Reinstall
npm install

# 4. Reset database
dropdb dental_saas && createdb dental_saas

# 5. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 6. Start fresh
npm run dev
```

## Getting More Help

### Documentation Files
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick setup guide
- `SETUP_NOTES.md` - Prisma 7 notes
- `DEPLOYMENT.md` - Deployment guide

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Material-UI Docs](https://mui.com)

### Check Logs

```bash
# Next.js dev server logs
# Already visible in terminal

# Database logs (macOS)
tail -f /usr/local/var/log/postgres.log

# Database logs (Linux)
sudo journalctl -u postgresql -f
```

## Prevention Tips

1. **Use the start script**: `./start.sh` handles most issues
2. **Keep dependencies updated**: Run `npm update` regularly
3. **Commit .env.example**: Never commit actual `.env`
4. **Run migrations**: Use `npx prisma migrate dev` instead of `db:push` in production
5. **Test locally first**: Always test before deploying

## Still Having Issues?

1. Check the error message carefully
2. Search this troubleshooting guide
3. Review the relevant documentation file
4. Check the specific technology's documentation
5. Look for similar issues on GitHub/Stack Overflow

---

**Most common fix**: Run `./start.sh` - it handles 90% of issues automatically!
