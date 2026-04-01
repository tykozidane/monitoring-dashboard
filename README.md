# NUTECH Monitoring Dashboard

Proyek monitoring dashboard yang dibangun dengan [Next.js](https://nextjs.org/) dan [Prisma](https://prisma.io/). Aplikasi ini menyediakan dashboard monitoring dengan fitur autentikasi, multi-language (English, French, Arabic), dan integrasi dengan database PostgreSQL.

## Fitur Utama

- 📊 Dashboard monitoring dengan visualisasi data
- 🔐 Autentikasi dengan NextAuth
- 🌐 Multi-language support (EN, FR, AR)
- 🗄️ Database dengan Prisma ORM
- 📱 Responsive design
- 🎨 Customizable theme dengan Material UI
- 📅 Calendar integration
- 📝 Rich text editor dengan Tiptap

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Language**: TypeScript
- **Database**: PostgreSQL dengan Prisma ORM
- **Styling**: Material UI, Tailwind CSS
- **State Management**: Redux Toolkit
- **Authentication**: NextAuth.js
- **Charts**: Recharts, ApexCharts
- **Icons**: Tabler Icons, Iconify

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) atau npm/yarn
- PostgreSQL database

### Installation

1. Clone repository ini:

```bash
git clone <repository-url>
cd monitoring-dashboard
```

2. Install dependencies:

```bash
pnpm install
```

3. Setup environment variables:

```bash
cp .env.example .env
# Edit .env dengan konfigurasi database dan API
```

4. Run migrations:

```bash
pnpm migrate
```

5. Run development server:

```bash
pnpm dev
```

Aplikasi akan berjalan di [http://localhost:4003](http://localhost:4003)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build untuk production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code dengan Prettier
- `pnpm migrate` - Run Prisma migrations
- `pnpm db:update` - Update database schema
- `pnpm clean` - Hapus .next folder
- `pnpm clear` - Hapus node_modules dan .next

## Project Structure

```
monitoring-dashboard/
├── prisma/              # Prisma schema dan migrations
├── src/
│   ├── @core/          # Core components
│   ├── @layouts/       # Layout components
│   ├── @menu/          # Menu components
│   ├── app/            # Next.js app router
│   ├── components/     # Reusable components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── libs/           # Third-party library wrappers
│   ├── prisma/         # Prisma client
│   ├── styles/         # Global styles
│   ├── theme/          # Theme configurations
│   └── utils/          # Utility functions
├── public/             # Static assets
├── types/              # TypeScript types
└── views/              # Page views
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."
API_BACKEND_URL="http://localhost:3000"
API_MONITORING_URL="http://localhost:3001"
BASEPATH="/dashboards/monitoring"
```

## Deployment

Deploy ke Vercel:

```bash
pnpm build
pnpm start
```

Atau deploy ke hosting lain dengan menjalankan `pnpm build` dan upload build folder.

## License

© 2026 NUTECH. All rights reserved.
