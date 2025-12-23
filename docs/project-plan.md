# Text the Check - Project Plan

> Collaborative expense tracking platform with WhatsApp chatbot and Nuxt.js dashboard

---

## Project Architecture

| Component | Tech Stack | Location |
|-----------|------------|----------|
| Frontend | Nuxt.js + Tailwind | `/client` |
| Backend | Node.js + Express | `/server` |
| Database | Firebase Firestore | Cloud |
| Bot | WhatsApp Business API | Integrated in `/server` |

---

## Current Status: Production Deployed ✅

**Last updated:** December 19, 2025

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://textthecheck.app |
| Backend | https://viaje-grupo-server.onrender.com (legacy URL, pending update) |
| Webhook | https://viaje-grupo-server.onrender.com/api/whatsapp/webhook |

### Completed Features

- [x] Express API with webhook endpoint
- [x] Firebase Admin integration
- [x] Message parsing with currency conversion (USD/EUR/BRL → ARS)
- [x] Auto-categorization (food, transport, accommodation, etc.)
- [x] @mention splitting logic
- [x] Phone whitelist authorization
- [x] Webhook signature verification
- [x] Rate limiting (100 req/min)
- [x] Input validation (positive amounts, description length)
- [x] Message deduplication
- [x] Outbound confirmation messages
- [x] Argentina phone number normalization
- [x] Real-time dashboard with expense feed
- [x] Balance calculations (Splitwise-style)
- [x] Category badges and relative timestamps
- [x] Firebase onSnapshot real-time sync

---

## Development Phases

### Phase 1: Security Hardening ✅ COMPLETE
**Target: 1 week**

- [x] Webhook signature verification
- [x] Rate limiting middleware
- [x] Input validation
- [x] Message deduplication
- [x] Firestore security rules
- [x] Remove debug logging (clean up verbose logs)
- [x] Enable signature verification in production (remove dev bypass)

### Phase 2: Production Deployment ✅ COMPLETE
**Target: 1 week**

**📋 See docs/deployment.md for complete deployment guide**

- [x] Deploy backend to Render
- [x] Set up production environment variables
- [x] Update Meta webhook URL to production domain
- [x] Deploy Nuxt.js frontend to Firebase Hosting
- [ ] Set up monitoring/logging (e.g., Sentry, LogRocket) - Optional for Phase 3

### Phase 3: Data Quality & Reliability ✅ COMPLETE
**Target: 1 week**

- [x] Integrate live exchange rate API (DolarApi.com with 30-min caching)
- [x] Improve name matching in splitAmong (fuzzy matching for @mentions using fuse.js)
- [x] Unified user system with groups and aliases
- [x] Google Auth linked to Firestore users (only pre-registered users can access)
- [ ] Structured logging (replace console.log with Winston/Pino) - Deferred to Phase 4
- [ ] Error tracking and alerting - Deferred to Phase 4

### Phase 4: Bot Commands & UX ✅ COMPLETE
**Target: 1-2 weeks**

- [x] `/help` or `/ayuda` - Show usage instructions
- [x] `/balance` or `/saldo` - Show current balances (Splitwise-style)
- [x] `/list` or `/lista` - Show recent expenses (last 10)
- [x] `/delete [n]` or `/borrar [n]` - Delete an expense by number
- [x] Better error messages (more helpful Spanish text)
- [x] Unknown command handling
- [ ] Structured logging (Winston/Pino) - Deferred to Phase 5
- [ ] Error tracking and alerting - Deferred to Phase 5

### Phase 5: Dashboard Enhancements ✅ COMPLETE
**Target: 1-2 weeks**

- [x] **5A: Group Selector** - Users can switch between groups
  - Created `useGroupStore` Pinia store for group management
  - Updated expense/user stores to filter by selected group
  - Added group dropdown in dashboard header
  - Persists selected group in localStorage
- [x] **5B: Settlement Recommendations UI**
  - Added `calculateSettlements()` to user store (greedy algorithm)
  - New "Para saldar deudas" section showing who pays whom
  - Color-coded (red → green) with arrows and amounts
  - Clickable creditors show payment info modal
- [x] **5C: Manual Expense Entry Form**
  - "Agregar gasto" button opens modal form
  - Fields: amount, description, category dropdown
  - Saves to Firestore with groupId, splitAmong defaults to all
- [x] **5D: User Profile & Payment Info**
  - New `/profile` page with user info display
  - Editable payment info: CBU, bank alias, Mercado Pago, bank name
  - Payment info viewable from settlements (click on creditor)
  - Copy-to-clipboard for payment details
- [x] **5E: Polish & UX**
  - Profile link in dashboard header (clickable avatar)
  - Mobile-responsive header with icon-only logout on small screens
  - Friendly empty state: "No hay gastos todavía. ¡Agregá el primero!"
  - Improved loading states

### Phase 6: Advanced Features (Backlog)
**Target: As needed**

- [ ] **User-Configurable Settlement Algorithm** - Let groups choose between settlement approaches
  - **Current:** Direct-only settlements (changed Dec 19, 2025)
    - Only creates settlements between people who actually shared expenses
    - More intuitive: every payment makes logical sense
    - More transactions: may require extra transfers
    - Example: If Valentina only shared expenses with Pipi, she only pays Pipi (never Sofía)
  - **Future Option:** Full debt simplification (greedy/graph-based)
    - Minimizes total number of transactions across the group
    - Less intuitive: may create payments between people who never shared expenses
    - Fewer transactions: optimizes for minimal transfers
    - Example: Valentina could pay Sofía to save Pipi from being a middleman
  - **Implementation Plan:**
    - Add group setting: "Settlement Algorithm" with radio buttons
    - Store preference in Firestore `groups` collection
    - Update `calculateSettlements()` to check group preference
    - Add UI explanation for each option with examples
  - **Files to modify:** `client/stores/useUserStore.ts` (settlement logic), group settings UI
- [ ] Receipt uploads (image support via WhatsApp)
- [ ] Monthly summary reports (automatic)
- [ ] Multi-currency tracking (keep original currency)
- [ ] Expense categories via emoji input
- [ ] Group management via WhatsApp
- [ ] Export to CSV/PDF
- [ ] Recurring expenses

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Webhook routes | `server/src/routes/whatsapp.js` |
| Message parser | `server/src/utils/messageParser.ts` |
| WhatsApp service | `server/src/services/whatsappService.ts` |
| User service | `server/src/services/userService.ts` |
| Mention matching | `server/src/services/mentionService.ts` |
| Exchange rates | `server/src/services/exchangeRateService.ts` |
| Bot commands | `server/src/services/commandService.ts` |
| Expense service | `server/src/services/expenseService.ts` |
| Firebase config | `server/src/config/firebase.ts` |
| Seed script | `server/scripts/seedUsers.ts` |
| Balance logic | `client/stores/useUserStore.ts` |
| Expense store | `client/stores/useExpenseStore.ts` |
| Group store | `client/stores/useGroupStore.ts` |
| Auth composable | `client/composables/useAuth.ts` |
| Profile page | `client/pages/profile.vue` |
| Dashboard | `client/pages/index.vue` |

---

## Environment Variables

### Required (Server)

```env
# WhatsApp
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_API_TOKEN=your_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Authorization (all 11 travelers)
ALLOWED_PHONE_NUMBERS=+5493794702813,+5493794702875,+5493794029833,+5493794887005,+5493794583503,+5493794229905,+5493794720969,+5493794770027,+5493794142450,+5493794625698,+5493794824341

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# Server
PORT=4000
NODE_ENV=development
```

### Production Additions

```env
NODE_ENV=production
SKIP_SIGNATURE_VERIFICATION=false
EXCHANGE_RATE_API_KEY=your_api_key
```

---

## Testing Checklist

Use these to verify the bot works correctly:

| Test | Input | Expected Result |
|------|-------|-----------------|
| Simple expense | `50 lunch` | ✅ Registered, category: food |
| Currency conversion | `USD 20 dinner` | ✅ Converted to ARS |
| Split expense | `100 taxi @Juan @María` | ✅ Split among mentioned users |
| Transport category | `500 uber` | ✅ Category: transport |
| Accommodation | `8000 hotel` | ✅ Category: accommodation |
| Invalid format | `hello` | ❌ Error message with format help |
| Invalid amount | `0 nothing` | ❌ Validation error |
| Negative amount | `-50 refund` | ❌ Validation error |
| Duplicate message | Send same message twice quickly | Only one expense created |
| Help command | `/ayuda` or `/help` | 📖 Usage instructions |
| Balance command | `/balance` or `/saldo` | 💰 Group balances |
| List command | `/lista` or `/list` | 📋 Last 10 expenses |
| Delete expense | `/borrar 1` | ✅ Deletes expense #1 (if you created it) |
| Delete by other | `/borrar 1` (created by someone else) | ⚠️ Error: only creator can delete |
| Unknown command | `/foo` | ❓ Unknown command message |

---

## Technical Debt

- [ ] Mixed TypeScript (.ts) and JavaScript (.js) in server - complete migration
- [ ] No test coverage - add Jest/Vitest tests
- [ ] Static exchange rates - integrate live API
- [ ] Console.log statements - replace with structured logging

---

## Meta/WhatsApp Configuration Reference

| Item | Value/Location |
|------|----------------|
| App ID | Meta for Developers > App Dashboard |
| WABA ID | `1517460372822361` |
| Phone Number ID | `930978723429770` |
| Webhook URL | `https://your-domain.com/api/whatsapp/webhook` |
| Subscribed fields | `messages` |

### Webhook Subscription Command (if needed again)

```bash
curl -X POST "https://graph.facebook.com/v18.0/YOUR_WABA_ID/subscribed_apps" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Quick Start (For Future Sessions)

When starting a new Claude Code session, paste this context:

> I'm working on Text the Check, a collaborative expense tracking platform.
> - `/client`: Nuxt.js + Tailwind frontend
> - `/server`: Node.js + Express backend with WhatsApp integration
> - Database: Firebase Firestore
> - Live: https://textthecheck.app
> - Current phase: [UPDATE THIS based on where you are]
> - See docs/project-plan.md for full context.

---

## Session Log

### December 18, 2025
- ✅ Completed project state assessment
- ✅ Implemented webhook signature verification
- ✅ Added rate limiting
- ✅ Added input validation
- ✅ Fixed Meta webhook subscription (was pointing to wrong app)
- ✅ Verified full pipeline: WhatsApp → Server → Firestore → Dashboard
- ✅ Outbound messages working
- ✅ Implemented and deployed Firestore security rules
  - Created comprehensive rules with validation for users and expenses collections
  - Configured Firebase project with firebase.json and .firebaserc
  - Successfully deployed rules to production
  - Created docs/firestore-security.md with deployment guide and authentication options
- ✅ Implemented Google Authentication in Nuxt.js client
  - Created useAuth composable for auth state management
  - Added login page with Google Sign-In button
  - Implemented auth middleware for route protection
  - Updated app.vue to initialize auth and manage data loading
  - Added user profile display and logout button in dashboard header
  - Created docs/google-auth.md with complete setup guide
  - Fixed cross-origin reactivity error with markRaw()
  - Fixed auth initialization race condition
- ✅ Cleaned up debug logging across codebase
  - Removed 60+ verbose console.log statements from WhatsApp webhook handlers
  - Cleaned up decorative separators and emoji-heavy logs
  - Kept essential error logging for debugging
  - Removed success message clutter from services
  - Client-side already had clean error-only logging
- ✅ Hardened webhook signature verification for production
  - Added explicit security check to prevent accidental bypass in production
  - Made bypass require BOTH NODE_ENV=development AND skip flag
  - Added validation for signature format
  - Improved error messages and logging
  - Added security documentation in code comments
- 🎉 Phase 1: Security Hardening COMPLETE
- ✅ Created docs/deployment.md
  - Complete environment variable configurations for dev and prod
  - Pre-deployment security checklist
  - Step-by-step deployment instructions for backend and frontend
  - Post-deployment verification steps
  - Rollback plan and monitoring setup
  - Critical security reminders
- 📍 Next: Phase 2 - Production Deployment (see docs/deployment.md)

### December 18, 2025 (Evening Session)
- ✅ Fixed server build script to copy JS files to dist directory
- ✅ Deployed Express backend to Render (https://viaje-grupo-server.onrender.com - legacy URL)
- ✅ Configured all production environment variables
- ✅ Updated Meta webhook URL to production domain
- ✅ Verified webhook signature verification working
- ✅ Added Firebase Hosting configuration
- ✅ Deployed Nuxt.js frontend to Firebase Hosting (https://textthecheck.app)
- ✅ Fixed FIREBASE_PRIVATE_KEY formatting issue on Render
- ✅ Verified end-to-end flow: WhatsApp → Render → Firestore → Dashboard
- 🎉 Phase 2: Production Deployment COMPLETE
- 📍 Next: Phase 3 - Data Quality & Reliability

### December 19, 2025
- ✅ Implemented unified user system with groups
  - Created `seedUsers.ts` script to migrate 11 users with aliases
  - New user structure: `id`, `name`, `phone`, `email`, `aliases[]`, `createdAt`
  - Created `groups` collection with "Brazil Trip 2025" group
  - All expenses now include `groupId` field
- ✅ Implemented fuzzy @mention matching with fuse.js
  - Created `mentionService.ts` for alias-based user matching
  - Handles typos, missing accents (María → maria), case insensitivity
  - 40% similarity threshold for confidence matching
- ✅ Updated WhatsApp handler
  - Looks up sender by phone in users collection
  - Finds user's group via `getGroupByUserId`
  - Resolves @mentions against group members using fuzzy matching
  - Includes `groupId` when saving expenses
- ✅ Updated Google Auth to link with Firestore users
  - Verifies user email exists in Firestore on login
  - Denies access to non-registered users
  - Stores both Firebase user and Firestore user in auth state
- ✅ Ran seed script successfully - 11 users and 1 group created
- ✅ Deployed server to Render and client to Firebase Hosting
- 🎉 Phase 3: Data Quality & Reliability COMPLETE
- 📍 Next: Phase 4 - Bot Commands & UX

### December 19, 2025 (Evening Session)
- ✅ Implemented WhatsApp bot commands
  - `/ayuda` or `/help` - Shows usage instructions in Spanish
  - `/balance` or `/saldo` - Shows Splitwise-style balances (who owes whom)
  - `/lista` or `/list` - Shows last 10 expenses with relative dates
  - `/borrar [n]` or `/delete [n]` - Deletes expense by number (creator only)
  - Unknown command handling with helpful error message
- ✅ Created commandService.ts for command logic
- ✅ Extended expenseService.ts with getExpensesByGroup, getAllExpensesByGroup, getExpenseById
- ✅ Improved error messages in Spanish with WhatsApp formatting (*bold*, `code`, _italic_)
- ✅ Balance calculation ported from client to server (same Splitwise algorithm)
- 🎉 Phase 4: Bot Commands & UX COMPLETE
- 📍 Next: Phase 5 - Dashboard Enhancements

### December 19, 2025 (Night Session)
- ✅ Implemented Phase 5: Dashboard Enhancements
- **5A: Group Selector**
  - Created `useGroupStore` Pinia store for group management
  - Query groups where user is a member (`array-contains`)
  - Updated `useExpenseStore` to filter by `groupId`
  - Updated `useUserStore` to fetch only group members
  - Added group dropdown in dashboard header
  - Persists selected group in localStorage
- **5B: Settlement Recommendations UI**
  - Added `Settlement` interface to types
  - Implemented `calculateSettlements()` greedy algorithm
  - Added "Para saldar deudas" section with visual design
  - Shows debtor → creditor with amounts
  - Click on creditor to see payment details
- **5C: Manual Expense Entry Form**
  - "Agregar gasto" button and modal
  - Form fields: amount, description, category
  - Validates inputs and shows error states
  - Saves to Firestore with groupId
- **5D: User Profile & Payment Info**
  - Created `/profile` page
  - Added `PaymentInfo` interface (cbu, alias, mercadoPago, bankName)
  - Display user info and editable payment section
  - Added `updateUserPaymentInfo()` to user store
  - Payment modal in settlements with copy-to-clipboard
- **5E: Polish & UX**
  - Profile link via clickable avatar in header
  - Mobile-responsive header (icon logout on small screens)
  - Friendly empty state with call-to-action
- 🎉 Phase 5: Dashboard Enhancements COMPLETE
- 📍 Next: Phase 5.5 - Final Polish (Transparency & Details)

### December 19, 2025 (Late Night Session)
- ✅ Implemented Phase 5.5: Final Polish - Transparency & Details
- **Task 1: Expandable Balance Breakdown**
  - Added chevron indicator (▸/▾) to balance items
  - Click to expand/collapse expense breakdown
  - Each line shows: category icon, description, who paid, and user's share
  - Color-coded amounts (positive/negative)
  - Smooth animation on expand/collapse
- **Task 2: Expandable Settlement Details**
  - Expandable rows with breakdown showing which expenses make up the debt
  - Shows recipient's payment info inline (CBU, CVU, Alias, Bank)
  - Copy button for payment details
  - "No agregó datos de pago aún" message if no info
- **Task 3: Enhanced Activity Feed**
  - Large category icon on left (🍽️ 🚕 🏨 🎉 🛍️ 📋)
  - Prominent description and amount
  - "Pagó: [Name] • hace 2 horas" format
  - "Dividido entre: [Names]" participant list
  - Per-person amount badge: "$ 3.000 c/u"
- **Task 4: Visual Polish**
  - Consistent card styling with rounded corners and subtle borders
  - Stats cards with icons and improved layout
  - Color coding: positive (green), negative (red), neutral (gray)
  - Mobile-first responsive design
  - Micro-interactions: hover states, smooth transitions
  - Replaced all emoji icons with SVG icons (Heroicons style)
- Added **Debt Simplification** to Phase 6 backlog (transaction minimization algorithm)
- Phase 5.5: Final Polish COMPLETE
- Deployed to Firebase Hosting

### December 19, 2025 (Post-Phase 5 Bug Fixes & Algorithm Change)
- ✅ **Fixed SSR Hydration Mismatch Issues**
  - Problem: Loading states causing DOM merging on slow network (spinner + content appearing together)
  - Fixed in `client/pages/profile.vue`: Wrapped auth-dependent content in `<ClientOnly>` with fallback
  - Fixed in `client/app.vue`: Wrapped global auth loading overlay in `<ClientOnly>`
  - Fixed in `client/pages/index.vue`: Wrapped dashboard content in `<ClientOnly>` with fallback
  - Root cause: Server-rendered HTML differed from client state during hydration
  - Impact: Eliminated confusing UI bug where entire content blocks would spin on page reload
- ✅ **Changed Settlement Algorithm from Greedy to Direct-Only**
  - **Previous:** Greedy matching (largest debtor → largest creditor)
    - Created unintuitive settlements (e.g., Valentina → Sofía when they never shared expenses)
    - Minimized transactions but confused users
  - **New:** Direct-only settlements (client/stores/useUserStore.ts:185-274)
    - Builds debt graph tracking who actually owes whom per expense
    - Nets out mutual debts (if A owes B $100 and B owes A $60 → A owes B $40)
    - Only creates settlements between people who shared at least one expense
    - More intuitive but may create more total transactions
  - **User Feedback:** "I don't understand why Valentina pays Sofía when they never shared expenses"
  - **Decision:** Chose intuitive settlements over transaction minimization
  - **Future:** Add user-configurable option in Phase 6 (see backlog)
- 📍 Status: Phase 5 fully complete with production bug fixes applied

### December 20, 2025 (Phase 5B: UX/UI Enhancement)
- ✅ **Major UX/UI Overhaul - Mobile-First Redesign**
- **Component Architecture (22 new components created):**
  - UI Primitives: AmountDisplay, CategoryIcon, UserAvatar, ConfirmDialog
  - Navigation: BottomNav, AppHeader
  - Balance: BalanceSummary, DebtSection, CreditSection, BalanceList, BalanceItem
  - Expense: ExpenseItem, ExpenseList, ExpenseModal, ExpenseFilters, ExpenseFilterChips
  - Group: GroupStats
  - Settlement: SettlementList, SettlementItem, PaymentInfoRow
  - Profile: LogoutButton, PaymentInfoModal
- **New Composables:**
  - `useNavigationState.ts` - Tab state and expense modal management
  - `useExpenseFilters.ts` - Filter state for Grupo tab
- **Task 1: Bottom Navigation Bar**
  - Fixed bottom nav on mobile with 4 tabs: Inicio, Grupo, + (add expense), Perfil
  - Elevated center button for adding expenses
  - Hidden on desktop (md:hidden)
  - iPhone safe area support (env(safe-area-inset-bottom))
- **Task 2: "Inicio" Tab - Personal Summary**
  - Big balance number with color coding (green=positive, red=negative)
  - "Tenes que pagar" section showing only people I owe
  - "Te deben" section showing only people who owe me
  - "Tus Gastos Recientes" filtered to expenses involving current user
  - Each expense shows user's share prominently
- **Task 3: "Grupo" Tab - Group Overview**
  - Group stats cards (members, expenses, total spent)
  - Full balance list with current user marked "(vos)"
  - All group activity with expense filters
  - Settlement recommendations with expandable details
- **Task 4: Filters Implementation**
  - Filter by person dropdown
  - Filter by payer: "Todos", "Pague yo", "Pagaron otros"
  - Active filter chips with clear button
  - Filters persist during session (useState)
- **Task 5: Numbers Never Truncated**
  - AmountDisplay component with flex-shrink-0 and whitespace-nowrap
  - Descriptions truncate with ellipsis, numbers always fully visible
  - Responsive font sizing for large amounts
- **Task 6: Profile Page Improvements**
  - Logout button moved from header to profile page
  - Confirmation dialog before logout ("Seguro que queres cerrar sesion?")
  - Bottom navigation visible on profile page
- **Task 7: Visual Design System**
  - Tailwind config extended with safe-area utilities (pb-safe, mb-safe)
  - Positive colors: green-600/400, Negative colors: red-600/400
  - Consistent card styling with rounded-xl and subtle borders
  - viewport-fit=cover meta tag for iPhone notch support
- **Task 8: Add Expense Modal Enhancement**
  - Bottom sheet design on mobile (slides up from bottom)
  - Centered modal on desktop
  - Large number input with currency selector
  - Participants multi-select
- **Code Reduction:**
  - index.vue reduced from ~1240 lines to ~200 lines
  - Logic extracted into reusable components
  - components/ directory now has 22 organized components
- 📍 Status: Phase 5B UX/UI Enhancement COMPLETE
