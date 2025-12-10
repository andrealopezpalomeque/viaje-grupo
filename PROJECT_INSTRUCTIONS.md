# ViajeGrupo - Group Vacation Expense Tracker

## Overview
ViajeGrupo is a **collaborative expense tracking platform** designed for a group of 11 friends traveling together.

**Primary focus:** Frictionless data entry via WhatsApp and real-time visualization via a Nuxt web dashboard. The system solves the "who owes who" problem by capturing expenses on the go and providing transparency on the trip budget.

**Target Users:** A closed group of 11 travelers who need to track shared costs (food, transport, accommodation) without logging into complex apps during the trip.

## Core Value Proposition
- **Zero-Friction Entry**: Users log expenses by texting a WhatsApp bot (e.g., "50 lunch").
- **Real-Time Transparency**: The web dashboard updates instantly when a message is received (via Firebase).
- **Automated Logic**: Smart parsing of unstructured text to categorize expenses.
- **Fair Splitting**: "Splitwise-style" logic to calculate balances (who owes whom).

## Tech Stack
- **Frontend**: Nuxt 4 (Vue 3), Tailwind CSS, TypeScript
- **Backend (API)**: Node.js + Express (Handling WhatsApp Webhooks)
- **Database & Realtime**: Firebase Firestore
- **State Management**: Pinia (Frontend data synchronization)
- **Styling**: Tailwind CSS exclusively
- **Icons**: Iconify with unplugin-icons
- **Formatting**: `intl` for currency, `dayjs` for dates

## Code Architecture

### Package JSON Scripts (Frontend)
```json
{
  "name": "viaje-grupo-web",
  "private": true,
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview"
  },
  "dependencies": {
    "@iconify/vue": "^5.0.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "@pinia/nuxt": "^0.11.2",
    "@vueuse/nuxt": "^13.6.0",
    "chart.js": "^4.4.1",
    "dayjs": "^1.11.10",
    "firebase": "^10.7.1",
    "nuxt": "^3.9.0",
    "pinia": "^2.1.7",
    "vue-chartjs": "^5.3.0",
    "vue3-toastify": "^0.2.8"
  }
}
```

### Architecture Patterns

#### Hybrid Flow
- **Write Path**: User → WhatsApp → Node.js Webhook → Firebase Admin SDK → Firestore
- **Read Path**: Firestore (Realtime Listener) → Nuxt Client SDK → Pinia Store → UI

#### Key Components
- **Stores**: Pinia manages the "Single Source of Truth" by subscribing to Firestore snapshots
- **Components**: Mobile-first dashboard widgets (Total Spent, Recent Activity, User Balances)
- **Utils**: Currency formatters, "Split" algorithms, and Date parsing

### Store Architecture & State Management

#### Pinia Implementation
- **useExpenseStore**: Subscribes to expenses collection with detailed getters for "Total Spent" and "Category Breakdown"
- **useUserStore**: Static list of the 11 travelers (Phone # ↔ Name mapping) and their individual balances

#### Store Method Pattern
```typescript
// Standard store methods
initializeListeners()      // Specific method to start Firebase onSnapshot
getExpensesByUser(userId)  // Filter expenses for specific person
calculateBalances()        // Algorithm to determine net debt/credit per person
```

### Component Structure
```
/components/
├── AppHeader.vue           # Navigation and User Toggle (if viewing as specific user)
├── Dashboard/
│   ├── TotalCard.vue       # Big number: "Total Trip Spend"
│   ├── SpenderRanking.vue  # Bar chart: Who spent the most?
│   └── BalanceGrid.vue     # Grid showing "Mike owes $50", "Sarah gets back $20"
├── Feed/
│   ├── ActivityStream.vue  # List of recent expenses (WhatsApp style bubbles)
│   └── ActivityItem.vue    # Individual expense item
└── ui/
    └── StatCard.vue        # Reusable metric card
```

## Data Models (TypeScript Interfaces)

### Core Entities

```typescript
// The 11 Travelers
export interface User {
  id: string          // unique string (can be phone number or uuid)
  name: string        // Display name (e.g., "Nico")
  phoneNumber: string // Format: +54911... (Key for WhatsApp identification)
  avatar?: string     // URL or Initials
}

// The Expense Record
export interface Expense {
  id: string
  userId: string         // Who paid?
  userName: string       // Denormalized name for easier display
  amount: number         // Always in base currency (e.g., USD)
  originalInput: string  // The raw text: "50 beers at beach"
  description: string    // Cleaned text: "beers at beach"
  category: ExpenseCategory
  timestamp: Date        // Firestore Timestamp
}

export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'entertainment' | 'general'

// For the UI "Who Owes Who" calculation
export interface Balance {
  userId: string
  paid: number   // Total amount this person put into the pot
  share: number  // How much they SHOULD have paid (Total / 11)
  net: number    // paid - share (Positive = owed money, Negative = owes money)
}
```

## Backend (Node.js/Express) Logic

### Webhook Entry Point (/api/whatsapp)

#### 1. Verification
Validate request comes from Meta/Twilio

#### 2. Identification
Match `req.body.from` (phone number) against Users database:
- If unknown: Reply "Access Denied"
- If known: Proceed

#### 3. Parsing Strategy
- Attempt Regex: `^(\d+)\s+(.*)$` (Number followed by text)
- Fallback: Mark as `review_needed`

#### 4. Action
Write to Firestore `expenses` collection

#### 5. Feedback
Send HTTP 200 to WhatsApp (and optional confirmation msg to user)

## UI/UX Principles for Trip Dashboard

**TARGET USERS:** Friends on vacation (Mobile usage, patchy internet, quick glances)

**PRIORITY:** Speed, Clarity, Mobile Responsiveness

### Design Requirements
- **Mobile First**: All charts and lists must look perfect on a 375px wide screen
- **Dark Mode**: High priority (users checking app at night/bars)
- **Visual Feedback**: When a new expense arrives via WebSocket, highlight it (flash yellow) to show the system is "live"

### Color Coding
- **Green**: Money you get back
- **Red**: Money you owe
- **Neutral**: General stats

## CSS & Styling Guidelines

- **MANDATORY**: Tailwind CSS exclusively
- **Font**: Inter or Roboto (clean sans-serif)
- **Layout**: CSS Grid for the dashboard, Flexbox for lists
- **Numbers**: Monospace font for all tabular financial data to ensure alignment

## Development Guidelines

### Language Rules
- **Code**: English (`calculateTotal`, `isLoading`)
- **UI Text**: Spanish (Argentina/Latam) ("Gastos Totales", "¿Quién debe?", "Historial")
- **Currency**: Format all money as `$ 1.234,00` (ES-AR locale) but store as standard Integers/Floats

### Bot Logic Rules (The "Smart" Part)
- **Currency Handling**: If user types "50", assume USD (or base currency). If user types "5000 ars", backend must convert to USD base using a static or live rate
- **Correction**: If a user makes a mistake, they should be able to delete via UI, not WhatsApp (keep WhatsApp logic simple: Write Only)

## Scaling Plan

- **Phase 1 (MVP)**: Text "Amount Description" → Saves to DB → Updates UI
- **Phase 2 (Images)**: User sends photo of receipt → OCR (OpenAI Vision) reads total → Saves to DB
- **Phase 3 (Settlement)**: "Checkout" button in UI that tells exactly who needs to pay whom to settle debts