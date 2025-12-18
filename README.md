# ViajeGrupo - Group Vacation Expense Tracker

A collaborative expense tracking platform for group vacations with WhatsApp integration and real-time updates.

## Features

- 📱 **WhatsApp Integration**: Log expenses by texting a bot (e.g., "50 lunch")
- 🔥 **Real-time Updates**: Firebase Firestore syncs data instantly across all devices
- 📊 **Smart Balance Calculations**: Splitwise-style "who owes whom" logic
- 🤖 **Auto-categorization**: AI parsing of expense messages into categories
- 🌙 **Dark Mode**: Full dark mode support
- 📱 **Mobile-first**: Optimized for on-the-go usage

## Tech Stack

### Frontend (Client)
- **Framework**: Nuxt 4 (Vue 3)
- **Language**: TypeScript
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore (Client SDK)
- **Utilities**: dayjs, Intl API

### Backend (Server)
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: Firebase Firestore (Admin SDK)
- **Webhook**: WhatsApp Business API integration

## Project Structure

```
viaje-grupo/
├── client/                 # Nuxt 4 frontend
│   ├── assets/            # CSS and static assets
│   ├── components/        # Vue components
│   ├── composables/       # Vue composables
│   ├── pages/             # Nuxt pages (file-based routing)
│   ├── plugins/           # Nuxt plugins
│   ├── stores/            # Pinia stores
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
│
├── server/                # Express backend
│   └── src/
│       ├── config/        # Firebase Admin config
│       ├── routes/        # API routes (WhatsApp webhook)
│       ├── services/      # Business logic
│       ├── utils/         # Parsers and helpers
│       └── types/         # TypeScript types
│
├── .env.example           # Environment variables template
└── package.json           # Workspace manager
```

## Setup

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for both client and server.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required configuration:
- **Firebase**: Project ID, API keys, Admin SDK credentials
- **WhatsApp**: Verify token, phone number ID
- **Users**: Authorized phone numbers (comma-separated)

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Download Admin SDK credentials (service account JSON)
4. Create a `users` collection with 11 user documents:
   ```json
   {
     "id": "1",
     "name": "Usuario Name",
     "phoneNumber": "+5491100000001"
   }
   ```

### 4. WhatsApp Business API Setup (Optional)

1. Set up WhatsApp Business API (via Meta or Twilio)
2. Configure webhook URL: `https://your-domain.com/api/whatsapp/webhook`
3. Set verify token in `.env`
4. Subscribe to message events

## Development

### Run both client and server concurrently:

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

### Expose the backend with ngrok (for WhatsApp webhooks)

If you want Meta/WhatsApp to reach your local Express server, you need a public HTTPS URL that forwards to `localhost:4000`.

1. Install and authenticate ngrok (once) following https://ngrok.com/docs/getting-started/
2. Start a tunnel to the server:

```bash
# From the repo root
npm run ngrok:server

# Or: run server + ngrok together
npm run dev:server:tunnel

# Pass extra ngrok args after `--` (example: reserved domain)
npm run ngrok:server -- --domain=your-subdomain.ngrok-free.app
```

Then configure your WhatsApp webhook URL to:
- `https://<your-ngrok-host>/api/whatsapp/webhook`

### WhatsApp IDs: `WHATSAPP_PHONE_NUMBER_ID` vs `WHATSAPP_ACCOUNT_ID` (WABA)

Meta uses different IDs for different Graph API operations:
- `WHATSAPP_PHONE_NUMBER_ID`: used to send messages (`POST /{phone-number-id}/messages`) and appears in webhook payloads under `metadata.phone_number_id`.
- `WHATSAPP_ACCOUNT_ID` (WABA ID): used for webhook app subscriptions (`GET /{waba-id}/subscribed_apps`).

To sanity-check your app is subscribed at the WABA level:
```bash
npm run whatsapp:subscribed-apps --workspace=server
```

### Build for production:

```bash
npm run build
```

## API Endpoints

### Server Endpoints

- `GET /api/health` - Health check
- `GET /api/whatsapp/webhook` - WhatsApp webhook verification
- `POST /api/whatsapp/webhook` - Receive WhatsApp messages

## How It Works

### Write Path (WhatsApp → Database)
1. User sends WhatsApp message: `"50 lunch at beach"`
2. Meta/WhatsApp forwards to our webhook
3. Server validates phone number against authorized list
4. Parser extracts amount (50) and description ("lunch at beach")
5. Auto-categorizer detects "lunch" → sets category to "food"
6. Expense saved to Firestore via Admin SDK

### Read Path (Database → UI)
1. Client subscribes to Firestore `expenses` collection
2. Real-time listener updates Pinia store automatically
3. Vue components react to store changes
4. UI updates instantly (no refresh needed)

## Message Format

Users can send expenses in natural language:

- `50 lunch` → $50,00 ARS, "lunch", category: food
- `120 taxi to airport` → $120,00 ARS, "taxi to airport", category: transport
- `10 usd cena` → ~$8.500,00 ARS (converted), "cena", category: food
- `100 brl almuerzo` → R$100,00 ingresados, ~$17.000,00 ARS (converted), "almuerzo", category: food

## Balance Calculation

The app calculates who owes whom using Splitwise-style logic:

1. **Total Spent** = Sum of all expenses
2. **Fair Share** = Total ÷ 11 people
3. **Net Balance** = (What you paid) - (Your fair share)
   - Positive = You're owed money
   - Negative = You owe money
   - Zero = You're settled up

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run both client and server |
| `npm run dev:client` | Run frontend only |
| `npm run dev:server` | Run backend only |
| `npm run build` | Build both for production |
| `npm run typecheck` | Type-check both projects |

## Documentation

See `docs/overview.md` for detailed architecture and development guidelines.

Additional documentation:
- `docs/project-plan.md` - Project roadmap and development phases
- `docs/deployment.md` - Production deployment guide
- `docs/firestore-security.md` - Security rules setup
- `docs/google-auth.md` - Google Authentication setup
- `docs/splitting-logic.md` - Balance calculation algorithm

## License

Private project for group use.
