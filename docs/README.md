# Dental Clinic SaaS Platform

A full-stack, production-ready SaaS platform for dental clinics in the US, built with Next.js 15, TypeScript, PostgreSQL, and Material Design 3.

## Features

### Core Functionality
- **Patient Management**: Complete CRUD operations for patient records with medical history, insurance details, and contact information
- **Appointment Scheduling**: Interactive calendar with drag-and-drop functionality for easy appointment management
- **Treatment Tracking**: Comprehensive treatment plans with checklists, CDT codes, and cost tracking
- **Insurance Claims**: Full claims management system with status tracking and automated processing
- **Dashboard Analytics**: Real-time statistics, patient queue, and revenue tracking
- **Secure Authentication**: Role-based access control (RBAC) for Admin, Dentist, Receptionist, and Hygienist roles
- **Messaging & Reminders**: Built-in communication system for patient follow-ups and notifications

### Technical Features
- **Material Design 3**: Beautiful, responsive UI following Google's Material Design guidelines
- **Type-Safe APIs**: RESTful API with Zod validation and TypeScript types throughout
- **Mobile-Responsive**: PWA-ready with optimized mobile experience
- **Modern Stack**: Next.js 15, React 19, Prisma ORM, PostgreSQL
- **Production Ready**: Includes migration scripts, seed data, and deployment configurations

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: Material-UI (MUI) v7 - Material Design 3
- **Forms & Validation**: Zod schemas
- **Calendar**: React Big Calendar with drag-and-drop
- **Data Grid**: MUI X Data Grid
- **Date Handling**: date-fns
- **State Management**: Zustand
- **Data Fetching**: SWR

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: NextAuth.js v5 (JWT-based)
- **Validation**: Zod

### Development
- **Language**: TypeScript
- **Testing**: Playwright (E2E)
- **Linting**: ESLint
- **Package Manager**: npm

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to the project directory
cd dental-saas

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL (if not already running)
# macOS (Homebrew):
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Windows: Use PostgreSQL service manager

# Create database
createdb dental_saas
```

### 3. Environment Configuration

Update the `.env` file with your database credentials:

```env
# Database
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/dental_saas?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# App Configuration
NODE_ENV="development"
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Database Migration & Seeding

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Demo Users

After seeding the database, you can login with these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dentalclinic.com | password123 |
| Dentist | dr.smith@dentalclinic.com | password123 |
| Dentist | dr.williams@dentalclinic.com | password123 |
| Receptionist | receptionist@dentalclinic.com | password123 |
| Hygienist | hygienist@dentalclinic.com | password123 |

## Database Schema

The application uses a comprehensive, normalized PostgreSQL schema:

### Core Models
- **User**: Staff accounts with role-based permissions (Admin, Dentist, Receptionist, Hygienist)
- **Patient**: Patient demographics, contact info, medical history, insurance details
- **Appointment**: Scheduling with types, statuses, and dentist assignments
- **Treatment**: Treatment plans with CDT codes, costs, and checklists
- **InsuranceClaim**: Claims tracking with status management
- **Reminder**: Automated patient reminders and notifications
- **Message**: Internal messaging system
- **Document**: File management for X-rays, consent forms, etc.
- **AuditLog**: Activity tracking and compliance logging

## API Architecture

The application uses **RESTful API routes** with the following structure:

### API Endpoints

**Patients**
- `GET /api/patients` - List patients with search and pagination
- `POST /api/patients` - Create new patient
- `GET /api/patients/[id]` - Get patient details
- `PATCH /api/patients/[id]` - Update patient
- `DELETE /api/patients/[id]` - Delete patient (Admin only)

**Appointments**
- `GET /api/appointments` - List appointments with filters
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/[id]` - Get appointment details
- `PATCH /api/appointments/[id]` - Update appointment
- `DELETE /api/appointments/[id]` - Cancel appointment

**Treatments**
- `GET /api/treatments` - List treatments
- `POST /api/treatments` - Create treatment plan
- Similar CRUD operations

**Insurance Claims**
- `GET /api/claims` - List claims
- `POST /api/claims` - Submit claim
- Similar CRUD operations

**Dashboard**
- `GET /api/dashboard/stats` - Get dashboard statistics

All endpoints require authentication and return type-safe JSON responses.

## Key Features Implementation

### 1. Material Design 3 Components

All UI components follow Material Design 3 guidelines:
- **Cards**: Patient cards, appointment cards with elevation and hover effects
- **App Bars**: Top navigation with branding and user menu
- **Navigation**: Drawer navigation with icons and active states
- **Dialogs**: Modal forms for creating/editing records
- **Tables**: DataGrid for listing patients, appointments, treatments
- **DatePickers**: Material date/time pickers for scheduling
- **Chips**: Status indicators and tags
- **Buttons**: Elevated, outlined, and text button variants

### 2. Authentication & RBAC

NextAuth.js v5 implementation with:
- Credentials-based login
- JWT session strategy
- Role-based middleware protection
- Secure password hashing with bcrypt
- Session management

### 3. Appointment Calendar

React Big Calendar with:
- Week/Month/Day views
- Drag-and-drop appointment creation
- Color-coded by status
- Quick appointment details
- Filter by dentist/patient

### 4. Data Validation

Zod schemas for all API endpoints ensure:
- Type-safe request/response handling
- Input sanitization
- Validation error messages
- Prevention of SQL injection and XSS

## Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Set up PostgreSQL database (Neon, Supabase, or Railway)
```

### Option 2: Docker

```dockerfile
# Dockerfile included for containerized deployment
docker build -t dental-saas .
docker run -p 3000:3000 dental-saas
```

### Option 3: Traditional Hosting

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Database Hosting Options
- **Neon**: Serverless PostgreSQL (recommended for Vercel)
- **Railway**: Easy PostgreSQL hosting
- **Supabase**: PostgreSQL with additional features
- **AWS RDS**: Production-grade managed PostgreSQL
- **Digital Ocean**: Managed databases

## Testing

```bash
# Run Playwright E2E tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## Project Structure

```
dental-saas/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # NextAuth endpoints
│   │   ├── patients/          # Patient CRUD
│   │   ├── appointments/      # Appointment CRUD
│   │   ├── treatments/        # Treatment CRUD
│   │   ├── claims/            # Insurance claims CRUD
│   │   └── dashboard/         # Analytics endpoints
│   ├── dashboard/             # Protected dashboard pages
│   │   ├── patients/          # Patient management UI
│   │   ├── appointments/      # Calendar UI
│   │   ├── treatments/        # Treatment tracker UI
│   │   ├── claims/            # Claims management UI
│   │   └── layout.tsx         # Dashboard layout with navigation
│   ├── login/                 # Login page
│   ├── providers.tsx          # Theme and context providers
│   └── layout.tsx             # Root layout
├── lib/
│   ├── prisma.ts              # Prisma client instance
│   ├── auth.ts                # NextAuth configuration
│   └── theme.ts               # Material-UI theme
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data script
├── public/
│   └── manifest.json          # PWA manifest
├── middleware.ts              # Auth middleware
├── .env                       # Environment variables
├── .env.example               # Example environment file
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

## Available Scripts

```bash
# Development
npm run dev                    # Start dev server

# Database
npm run db:generate            # Generate Prisma Client
npm run db:push                # Push schema to database
npm run db:migrate             # Create and run migration
npm run db:seed                # Seed database with sample data
npm run db:studio              # Open Prisma Studio (DB GUI)

# Build & Production
npm run build                  # Build for production
npm start                      # Start production server

# Code Quality
npm run lint                   # Run ESLint

# Testing
npx playwright test            # Run E2E tests
```

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure session management
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **XSS Prevention**: Input sanitization with Zod
- **CSRF Protection**: Built-in Next.js protection
- **Role-Based Access**: Middleware-protected routes
- **Audit Logging**: Track all user actions

## Mobile Support & PWA

The application is fully responsive and PWA-ready:
- Responsive Material Design layout
- Touch-optimized components
- Offline support capability
- Add to home screen
- Service worker ready

## Performance Optimizations

- **Server Components**: React Server Components for optimal performance
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting per route
- **Font Optimization**: Self-hosted optimized fonts
- **Database Indexing**: Optimized Prisma schema with indexes
- **API Caching**: SWR for client-side caching

## Future Enhancements (AI Features)

The platform is structured to easily add:
- **AI Insurance Processing**: Automated claim form parsing with NLP
- **Treatment Suggestions**: ML-based treatment recommendations
- **Appointment Optimization**: Smart scheduling algorithms
- **Patient Visit Summaries**: Auto-generated visit summaries
- **Predictive Analytics**: Patient risk assessment and follow-up suggestions

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test database connection
psql -U postgres -d dental_saas
```

### Prisma Issues
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client
npm run db:generate
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

This is a template project. Feel free to:
- Customize for your clinic's needs
- Add additional features
- Modify the theme and branding
- Extend the database schema

## License

MIT License - feel free to use this project for your dental clinic.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation in the code comments
3. Check Prisma and Next.js documentation

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI powered by [Material-UI](https://mui.com/)
- Database by [PostgreSQL](https://www.postgresql.org/)
- ORM by [Prisma](https://www.prisma.io/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

---

Built with ❤️ for dental professionals
