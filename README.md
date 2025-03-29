# Business Management Platform

A comprehensive full-stack business management platform designed to streamline operations for service-based businesses, with a focus on project management, quotes, invoices, surveys, installations, and resource allocation.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Business Workflow](#business-workflow)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [License](#license)

## Overview

This application provides a complete solution for businesses to manage their entire workflow from initial customer contact through quotes, surveys, installations, invoicing, and project completion. It includes a customizable terminology system to adapt to different industries, multi-currency support, and company branding integration.

## Key Features

- **Authentication System**: Secure user registration and login with role-based permissions
- **Dashboard**: Real-time metrics and activity monitoring with customizable widgets
- **Customer Management**: Comprehensive CRM functionality with contact details and history
- **Quote Generation**: Create, manage, and convert quotes with customizable templates
- **Project Management**: Track projects from initiation to completion with status updates
- **Survey Scheduling**: Book and manage customer surveys with calendar integration
- **Installation Management**: Schedule installations and track completion
- **Invoice System**: Generate professional invoices linked to quotes and projects
- **Timesheet Tracking**: Monitor employee time on projects
- **Catalog Management**: Maintain product/service catalog with pricing
- **Reporting**: Comprehensive reporting and data export options
- **Terminology Customization**: Adapt business terms to match industry-specific language
- **Company Branding**: Customize documents with company logo, details and certifications
- **WebSocket Integration**: Real-time updates and notifications
- **Responsive Design**: Full functionality on desktop, tablet, and mobile devices

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **PDF Generation**: Custom PDF generation service
- **Real-time Updates**: WebSockets with Socket.IO
- **Build System**: Vite

## Installation

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/business-management-platform.git
   cd business-management-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/yourdbname
   SESSION_SECRET=your_session_secret
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application at `http://localhost:5000`

## Configuration

### Database Configuration

The application uses PostgreSQL with Drizzle ORM. Database schema is defined in `shared/schema.ts`.

To modify the database schema:
1. Update the models in `shared/schema.ts`
2. Run `npm run db:push` to apply changes

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `GOOGLE_CLOUD_CLIENT_EMAIL`: For Google Cloud Storage integration (optional)
- `GOOGLE_CLOUD_PRIVATE_KEY`: For Google Cloud Storage integration (optional)
- `GOOGLE_CLOUD_PROJECT_ID`: For Google Cloud Storage integration (optional)
- `GOOGLE_CLOUD_BUCKET_NAME`: For Google Cloud Storage integration (optional)

## Usage Guide

### Authentication

- Register a new account via the `/auth` page
- Login with your credentials
- Session persists until logout

### Dashboard

- Overview of key metrics, recent activities, and pending tasks
- Quick navigation to all major sections
- Customizable widgets based on role and preferences

### Customer Management

- Add new customers with contact details
- View customer history including quotes, projects, and invoices
- Filter and search customer database

### Quote Management

1. Create new quotes for customers
2. Add line items from catalog or custom entries
3. Set expiry dates and terms
4. Send quotes to customers
5. Convert accepted quotes to projects or invoices

### Project Management

1. Create projects from accepted quotes
2. Track project status and progress
3. Assign resources and schedule tasks
4. Monitor project budgets and timelines

### Survey Management

1. Schedule customer surveys
2. Record survey details and requirements
3. Generate quotes based on survey results

### Installation Management

1. Schedule installations after deposit payment
2. Track installation progress
3. Record completion and follow-up tasks

### Invoice Management

1. Generate invoices from quotes or projects
2. Track payment status
3. Send reminders for overdue invoices
4. Record payments

### Settings

- Company profile configuration
- User management
- Terminology customization
- Document templates
- System preferences

## Business Workflow

The standard business workflow follows this sequence:

1. **Quote Creation**: Generate a quote for a customer
2. **Quote Acceptance**: Customer accepts the quote
3. **Survey Scheduling**: Schedule a survey date with the customer
4. **Deposit Invoice**: Generate fabrication drawings and a deposit invoice
5. **Deposit Payment**: Customer pays the deposit
6. **Installation Scheduling**: Schedule installation date
7. **Installation Completion**: Complete installation (verify no snagging work)
8. **Final Invoice**: Send final invoice to customer
9. **Final Payment**: Customer pays final invoice
10. **Project Completion**: Mark project as completed

## API Documentation

### Authentication Endpoints

- `POST /api/register`: Register a new user
- `POST /api/login`: Authenticate a user
- `POST /api/logout`: Log out the current user
- `GET /api/user`: Get the current user's information

### Customer Endpoints

- `GET /api/customers`: Get all customers
- `GET /api/customers/:id`: Get customer by ID
- `POST /api/customers`: Create a new customer
- `PUT /api/customers/:id`: Update a customer
- `DELETE /api/customers/:id`: Delete a customer

### Quote Endpoints

- `GET /api/quotes`: Get all quotes
- `GET /api/quotes/:id`: Get quote by ID
- `POST /api/quotes`: Create a new quote
- `PUT /api/quotes/:id`: Update a quote
- `DELETE /api/quotes/:id`: Delete a quote
- `POST /api/quotes/:id/accept`: Mark a quote as accepted
- `POST /api/quotes/:id/reject`: Mark a quote as rejected
- `POST /api/quotes/:id/convert-to-invoice`: Convert a quote to an invoice

### Project Endpoints

- `GET /api/projects`: Get all projects
- `GET /api/projects/:id`: Get project by ID
- `POST /api/projects`: Create a new project
- `PUT /api/projects/:id`: Update a project
- `DELETE /api/projects/:id`: Delete a project
- `PUT /api/projects/:id/status`: Update project status

### Invoice Endpoints

- `GET /api/invoices`: Get all invoices
- `GET /api/invoices/:id`: Get invoice by ID
- `POST /api/invoices`: Create a new invoice
- `PUT /api/invoices/:id`: Update an invoice
- `DELETE /api/invoices/:id`: Delete an invoice
- `PUT /api/invoices/:id/status`: Update invoice status
- `POST /api/invoices/:id/mark-paid`: Mark an invoice as paid

### Survey Endpoints

- `GET /api/surveys`: Get all surveys
- `GET /api/surveys/:id`: Get survey by ID
- `POST /api/surveys`: Create a new survey
- `PUT /api/surveys/:id`: Update a survey
- `DELETE /api/surveys/:id`: Delete a survey

### Installation Endpoints

- `GET /api/installations`: Get all installations
- `GET /api/installations/:id`: Get installation by ID
- `POST /api/installations`: Create a new installation
- `PUT /api/installations/:id`: Update an installation
- `DELETE /api/installations/:id`: Delete an installation

### Settings Endpoints

- `GET /api/settings`: Get all settings
- `PUT /api/settings`: Update settings

## Database Schema

The application uses the following main database tables:

- `users`: User accounts and authentication
- `customers`: Customer information
- `projects`: Project details and status
- `quotes`: Quote information and line items
- `invoices`: Invoice information and line items
- `surveys`: Survey scheduling and details
- `installations`: Installation scheduling and details
- `employees`: Employee information
- `timesheets`: Employee time tracking
- `catalog_items`: Product and service catalog
- `company_settings`: Company profile and system settings

## Deployment

### Deploying on Replit

1. Click the "Deploy" button in the Replit interface
2. Follow the deployment prompts
3. Your application will be deployed to a `.replit.app` domain

### Deploying on Other Platforms

#### Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- Environment variables configured

#### Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Connecting to GitHub

To connect your Replit project to GitHub:

1. Create a new GitHub repository
2. In your Replit project, initialize a Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. Connect to your GitHub repository:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

4. For continuous integration, you can set up a GitHub Actions workflow:
   Create a file at `.github/workflows/ci.yml`:
   ```yaml
   name: CI

   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v3
       - name: Use Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '20'
       - run: npm ci
       - run: npm run build
       - run: npm test
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

© 2025 Your Company Name. All rights reserved.