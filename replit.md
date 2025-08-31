# Business Management Platform

## Overview

This is a comprehensive multi-tenant SaaS business management platform built with modern web technologies. The application provides complete business workflow automation including project management, quote generation, invoice management, customer relationship management, and employee management with role-based permissions.

## System Architecture

### Multi-Tenant SaaS Architecture
- **Tenant Isolation**: Strict data segregation with tenant-scoped queries
- **Role-Based Access Control**: Admin, manager, and employee roles within tenant context
- **Delegated Administration**: Fine-grained permissions and team management
- **Active Tenant Filtering**: Public endpoints only return active tenants

### Technology Stack
- **Frontend**: React 18 with TypeScript, Vite for development
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Tailwind CSS with Shadcn/UI components
- **Authentication**: Passport.js with session-based auth
- **File Storage**: S3-compatible storage with local fallback

## Key Components

### Frontend Architecture
- **React with TypeScript**: Type-safe component development
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first responsive design framework
- **Shadcn/UI**: Professional component library
- **TanStack Query**: Data fetching and state management
- **Wouter**: Lightweight routing solution
- **React Hook Form**: Form handling with validation

### Backend Architecture
- **Express Server**: RESTful API with middleware pipeline
- **Drizzle ORM**: Type-safe database operations
- **Multi-tenant Storage Layer**: Centralized data access with tenant isolation
- **Service Layer**: Business logic abstraction (PDF, Email, File services)
- **WebSocket Support**: Real-time notifications and updates

### Database Design
- **Tenant-First Schema**: All tables include tenantId for isolation
- **Comprehensive Schema**: 20+ tables covering all business entities
- **Migration System**: Automated schema management
- **Performance Optimized**: Indexed queries and efficient relationships

## Data Flow

### Request Flow
1. **Authentication Middleware**: Validates user session
2. **Tenant Filter Middleware**: Applies tenant-specific data filtering
3. **Route Handlers**: Process business logic with service layer
4. **Storage Layer**: Executes tenant-scoped database operations
5. **Response**: Returns filtered, tenant-specific data

### Multi-Tenant Data Access
- All database operations are automatically scoped to the authenticated user's tenant
- Helper functions `getTenantFilterFromRequest()` and `getTenantIdFromRequest()` ensure consistent tenant filtering
- Cross-tenant data access is prevented at the storage layer

## External Dependencies

### Required Services
- **PostgreSQL Database**: Primary data storage (configurable via DATABASE_URL)
- **SendGrid**: Email notifications and communications
- **S3-Compatible Storage**: File uploads and document storage (AWS S3 or compatible)

### Optional Integrations
- **Google Cloud Storage**: Alternative file storage option
- **Sharp**: Image processing for logos and uploads
- **PDFKit**: Professional PDF generation for quotes and invoices

### Development Dependencies
- **Drizzle Kit**: Database migration management
- **ESBuild**: Production build optimization
- **TypeScript**: Type checking and compilation

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Build Process**: `npm run build` (Vite + ESBuild)
- **Production Start**: `npm run start`
- **Development**: `npm run dev` with hot reloading
- **Port Configuration**: Internal port 5000, external port 80

### Environment Variables
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
SENDGRID_API_KEY=your-sendgrid-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=your-aws-region
AWS_S3_BUCKET=your-s3-bucket
```

### Post-Deployment
- Automatic GitHub synchronization via `post-deploy.js`
- Database migrations run automatically on startup
- Health checks verify database connectivity

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 31, 2025 - UK Localization & Health Endpoints
- **UK Currency Localization**: Updated all financial forms to use GBP (£) as default currency with UK formatting (en-GB locale)
- **20% VAT Default**: Set VAT/tax rate to 20% default across quotes, invoices, and purchase orders
- **GBP Price Calculations**: Updated price API endpoint to calculate in GBP currency
- **UK Number Formatting**: Implemented proper thousands/decimal separators for UK locale
- **Added Health Check Endpoints**: Implemented `/api/health` and `/api/__about` endpoints similar to FastAPI pattern
- **Simplified Dashboard Implementation**: Replaced complex dashboard with user-friendly simple version per user request
- **Fixed Database Issues**: Resolved TypeScript compilation errors and database query problems
- **Stabilized Application**: Eliminated server restart loops and improved application reliability

### June 26, 2025 - Empty State Implementation & Database Fixes
- **Fixed Database Schema**: Added missing `deposit_invoice_id` and `final_invoice_id` columns to projects table
- **Implemented Empty State Design**: Created professional welcome screen for dashboard when no data exists
- **Enhanced User Experience**: Added quick-start action cards for creating first project, customers, and quotes
- **Improved GitHub Integration**: Successfully connected repository with proper authentication
- **Mobile-First Responsive Design**: Completed responsive layout with hamburger menu and collapsible sidebar

### Key Features Added
- **Health Check Endpoints**: `/api/health` returns status, `/api/__about` provides app info and route listing
- **Price Calculation API**: `/api/price` endpoint for quote calculations with material, labor, travel costs
- **Footer Health Links**: Added health check links in application footer for easy access
- **Simple Dashboard Service**: Basic data retrieval without complex aggregations
- **WelcomeEmptyState Component**: Engaging welcome screen with rocket icon and call-to-action buttons
- **Conditional Dashboard Rendering**: Smart detection of data availability to show appropriate interface
- **Getting Started Checklist**: Clear onboarding guidance for new users
- **Database Schema Alignment**: Resolved column mismatch issues for smooth operation

## Changelog

- June 26, 2025: Initial setup with multi-tenant architecture
- June 26, 2025: Empty state implementation and database schema fixes