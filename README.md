# Text the Check

> Collaborative expense tracking via WhatsApp

Split expenses with friends during trips. Add expenses via WhatsApp, see balances in real-time on the dashboard.

**Live:** https://textthecheck.app

## Features

- **WhatsApp Integration**: Log expenses by texting a bot (e.g., "50 lunch")
- **Real-time Updates**: Firebase Firestore syncs data instantly across all devices
- **Smart Balance Calculations**: Splitwise-style "who owes whom" logic
- **Auto-categorization**: AI parsing of expense messages into categories
- **Multi-currency Support**: USD, EUR, BRL auto-converted to ARS
- **@mention Splitting**: Split expenses with specific people (e.g., "100 taxi @Juan @Maria")
- **Bot Commands**: `/balance`, `/lista`, `/borrar`, `/ayuda`
- **Dark Mode**: Full dark mode support
- **Mobile-first**: Optimized for on-the-go usage

## Tech Stack

### Frontend (Client)
- **Framework**: Nuxt 4 (Vue 3)
- **Language**: TypeScript
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore (Client SDK)
- **Auth**: Firebase Google Authentication
- **Utilities**: dayjs, Intl API

### Backend (Server)
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: Firebase Firestore (Admin SDK)
- **Webhook**: WhatsApp Business API integration

## Documentation

- [Project Plan](./docs/project-plan.md) - Development phases and session log
- [Deployment Guide](./docs/deployment.md) - Production deployment checklist
- [Google Auth Setup](./docs/google-auth.md) - Authentication configuration
- [Firestore Security](./docs/firestore-security.md) - Security rules documentation
- [Splitting Logic](./docs/splitting-logic.md) - Balance calculation algorithm
- [Icon Usage](./docs/icons.md) - Using unplugin-icons
- [Architecture Overview](./docs/overview.md) - Detailed system design

## Development

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Firebase project with Firestore
- WhatsApp Business API access (optional for local dev)

### 1. Install Dependencies

```bash
npm run install:all
```

This installs dependencies for both client and server.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required configuration:
- **Firebase**: Project ID, API keys, Admin SDK credentials
- **WhatsApp**: Verify token, phone number ID
- **Users**: Authorized phone numbers (comma-separated)

### 3. Run Development Server

```bash
npm run dev
```

This starts:
- **Client**: `http://localhost:3000`
- **Server**: `http://localhost:4000`

### Run individually:

```bash
npm run dev:client   # Frontend only
npm run dev:server   # Backend only
```

### Expose backend for WhatsApp webhooks:

```bash
npm run ngrok:server
```

Then configure your WhatsApp webhook URL to:
`https://<your-ngrok-host>/api/whatsapp/webhook`

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://textthecheck.app |
| Backend | https://viaje-grupo-server.onrender.com |

> **Note:** The backend is still hosted at `viaje-grupo-server.onrender.com`. This will be updated in a future release.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/whatsapp/webhook` - WhatsApp webhook verification
- `POST /api/whatsapp/webhook` - Receive WhatsApp messages

## Message Format

Users can send expenses in natural language:

- `50 lunch` → $50 ARS, "lunch", category: food
- `120 taxi to airport` → $120 ARS, "taxi to airport", category: transport
- `USD 10 dinner` → Converted to ARS, "dinner", category: food
- `100 hotel @Juan @Maria` → Split among Juan, Maria, and payer

## Bot Commands

| Command | Description |
|---------|-------------|
| `/ayuda` or `/help` | Show usage instructions |
| `/balance` or `/saldo` | Show group balances |
| `/lista` or `/list` | Show last 10 expenses |
| `/borrar [n]` or `/delete [n]` | Delete expense by number |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run both client and server |
| `npm run dev:client` | Run frontend only |
| `npm run dev:server` | Run backend only |
| `npm run build` | Build both for production |
| `npm run typecheck` | Type-check both projects |

## License

Private project for group use.
