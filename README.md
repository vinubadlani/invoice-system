# Invoicing App

A modern invoicing application built with Next.js, TypeScript, and Supabase. This application allows businesses to manage their invoices, parties, items, payments, and generate reports.

## Features

- 🔐 User authentication with Supabase Auth
- 🏢 Multi-business support
- 📋 Invoice management (Sales & Purchase)
- 👥 Party management (Customers & Suppliers)
- 📦 Item/Product management
- 💰 Payment tracking
- 🏦 Bank transaction management
- 📊 Reports and analytics
- 📱 Responsive design
- 🎨 Modern UI with Tailwind CSS and shadcn/ui

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd invoicing-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Run the SQL scripts in the `scripts/` folder in your Supabase SQL editor:
   - `create-database-tables.sql` - Creates all necessary tables
   - `setup-rls-policies.sql` - Sets up Row Level Security policies
   - `create-admin-user.sql` - Creates a sample admin user (optional)

5. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables:
- `users` - User profiles
- `businesses` - Business information
- `parties` - Customers and suppliers
- `items` - Products/services
- `invoices` - Sales and purchase invoices
- `payments` - Payment records
- `bank_transactions` - Bank transaction records

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.# invoice-system
# invoice-system
