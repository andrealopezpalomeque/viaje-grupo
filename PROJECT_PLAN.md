# ViajeGrupo - Project Plan

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

## Current Status: WhatsApp MVP Complete ✅

**Last updated:** December 18, 2025

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

### Phase 1: Security Hardening ⬅️ YOU ARE HERE
**Target: 1 week**

- [x] Webhook signature verification
- [x] Rate limiting middleware
- [x] Input validation
- [x] Message deduplication
- [ ] Firestore security rules
- [ ] Remove debug logging (clean up verbose logs)
- [ ] Enable signature verification in production (remove dev bypass)

### Phase 2: Production Deployment
**Target: 1 week**

- [ ] Deploy backend to Railway/Render/Heroku
- [ ] Set up production environment variables
- [ ] Update Meta webhook URL to production domain
- [ ] Configure production Firebase project (if separate)
- [ ] Set up monitoring/logging (e.g., Sentry, LogRocket)
- [ ] Deploy Nuxt.js frontend to Vercel/Netlify

### Phase 3: Data Quality & Reliability
**Target: 1 week**

- [ ] Integrate live exchange rate API (replace `messageParser.ts:124-130`)
  - Suggested APIs: ExchangeRate-API, Open Exchange Rates, or BCRA for ARS
- [ ] Improve name matching in splitAmong (fuzzy matching for @mentions)
- [ ] Add expense validation edge cases
- [ ] Structured logging (replace console.log with Winston/Pino)
- [ ] Error tracking and alerting

### Phase 4: Bot Commands & UX
**Target: 1-2 weeks**

- [ ] `/help` - Show usage instructions
- [ ] `/balance` - Show current balances
- [ ] `/list` - Show recent expenses
- [ ] `/delete [id]` - Delete an expense
- [ ] Better error messages (more helpful Spanish text)
- [ ] Unknown command handling

### Phase 5: Dashboard Enhancements
**Target: 1-2 weeks**

- [ ] Manual expense entry form
- [ ] Expense editing capability
- [ ] Settlement recommendations UI ("Juan should pay María $500")
- [ ] Bot setup/linking page
- [ ] User profile management

### Phase 6: Advanced Features (Backlog)
**Target: As needed**

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
| Firebase config | `server/src/config/firebase.ts` |
| Balance logic | `client/stores/useUserStore.ts` |
| Expense store | `client/stores/useExpenseStore.ts` |

---

## Environment Variables

### Required (Server)

```env
# WhatsApp
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_API_TOKEN=your_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Authorization
ALLOWED_PHONE_NUMBERS=+5493794702813,+5493794702875

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

> I'm working on ViajeGrupo, a collaborative expense tracking platform.
> - `/client`: Nuxt.js + Tailwind frontend
> - `/server`: Node.js + Express backend with WhatsApp integration
> - Database: Firebase Firestore
> - Current phase: [UPDATE THIS based on where you are]
> - See PROJECT_PLAN.md in the repo root for full context.

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
- 📍 Next: Firestore security rules, then production deployment
