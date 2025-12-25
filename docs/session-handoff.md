# Text the Check - Session Handoff Document

**Last updated:** December 25, 2025  
**Purpose:** Context document to start new Claude conversations with full project knowledge

---

## 🚀 Quick Start for New Sessions

Paste this at the start of any new Claude conversation:

> I'm working on **Text the Check**, a collaborative expense tracking app where users log expenses via WhatsApp and view balances on a web dashboard.
>
> **Tech Stack:**
> - `/client`: Nuxt.js + Tailwind + Pinia (Firebase Hosting)
> - `/server`: Node.js + Express (Render)
> - Database: Firebase Firestore
> - Bot: WhatsApp Business API
>
> **Live URLs:**
> - Dashboard: https://textthecheck.app
> - Backend: https://viaje-grupo-server.onrender.com
>
> **Current Phase:** Closed Beta Testing with 3 friend groups
>
> See `docs/session-handoff.md` for full context, or I can explain what I need.

---

## 📋 Project Summary

### What It Does

Users split expenses during trips by texting a WhatsApp bot:
- `100 taxi` → Logs expense, splits among group
- `USD 50 dinner @Juan @Maria` → Converts currency, splits among mentioned people
- `/balance` → Shows who owes whom
- `/grupo` → Switch between groups

Dashboard at textthecheck.app shows real-time balances, settlements, and payment info.

### The Core Insight

> **Splitwise friction:** Everyone downloads app + creates account + joins group
>
> **Our solution:** ONE person creates group, friends just text. No app downloads.

---

## 🏗️ Architecture

### Data Model

```
users/
├── {userId}
│   ├── name: "Juan Pérez"
│   ├── phone: "+5493794702813"
│   ├── email: "juan@gmail.com" (nullable)
│   ├── aliases: ["juan", "juanpe"]  ← for @mention matching
│   ├── activeGroupId: "brazil-2026" ← current group for WhatsApp
│   ├── paymentInfo: { cbu, alias, mercadoPago, bankName }
│   └── createdAt: timestamp

groups/
├── {groupId}
│   ├── name: "Brazil Trip 2025"
│   ├── members: [userId1, userId2, ...]
│   ├── createdBy: userId
│   └── createdAt: timestamp

expenses/
├── {expenseId}
│   ├── groupId: "brazil-2026"
│   ├── paidBy: userId
│   ├── amount: 1500 (always in ARS)
│   ├── originalAmount: 50 (if foreign currency)
│   ├── originalCurrency: "USD"
│   ├── description: "taxi"
│   ├── category: "transport"
│   ├── splitAmong: [userId1, userId2]
│   └── createdAt: timestamp
```

### Key Services (Server)

| File | Purpose |
|------|---------|
| `routes/whatsapp.js` | Webhook handler, message routing |
| `services/commandService.ts` | Bot commands (/ayuda, /balance, etc.) |
| `services/expenseService.ts` | CRUD for expenses |
| `services/userService.ts` | User lookup, group membership |
| `services/mentionService.ts` | Fuzzy @mention matching (Fuse.js) |
| `services/exchangeRateService.ts` | DolarApi.com integration |
| `utils/messageParser.ts` | Parse "100 taxi @Juan" into structured data |

### Key Components (Client)

| File | Purpose |
|------|---------|
| `composables/useAuth.ts` | Google Auth + Firestore user linking |
| `stores/useExpenseStore.ts` | Expense state, real-time sync |
| `stores/useUserStore.ts` | Balance calculations |
| `pages/index.vue` | Main dashboard |
| `pages/profile.vue` | User profile, payment info |

---

## ✅ What's Built & Working

### WhatsApp Bot
- [x] Natural language expense entry
- [x] Multi-currency (USD, EUR, BRL → ARS via DolarApi.com Blue rate)
- [x] @mention splitting with fuzzy matching (Fuse.js)
- [x] Commands: `/ayuda`, `/balance`, `/lista`, `/borrar`, `/grupo`
- [x] Auto-categorization (food, transport, accommodation, etc.)
- [x] Multi-group support with `/grupo` switching
- [x] Security: webhook signature verification, rate limiting

### Web Dashboard
- [x] Google Authentication (linked to Firestore users)
- [x] Real-time expense feed
- [x] Personal view ("Tu Resumen") vs Group view
- [x] Settlement recommendations
- [x] Payment info with copy-to-clipboard
- [x] Group selector dropdown
- [x] Bottom navigation (mobile)
- [x] Profile page with payment details

### Infrastructure
- [x] Backend on Render (auto-deploy from GitHub)
- [x] Frontend on Firebase Hosting
- [x] Custom domain: textthecheck.app
- [x] Firestore security rules

---

## ❌ What's NOT Built Yet

### Critical for Public Launch

| Feature | Why Needed | Estimate |
|---------|------------|----------|
| Self-registration | Users can't create accounts | 1 week |
| Group creation UI | Groups require seed scripts | 1 week |
| Friend invitation flow | Can't add friends without dev | 1 week |
| WhatsApp Business verification | Meta approval for public access | 1-4 weeks |

### Nice to Have (Post-Launch)

- Receipt/image upload
- Export to CSV/PDF
- Public shareable balance links
- WhatsApp-based onboarding flow

---

## 🧪 Current Test Groups

### Group 1: Brazil Trip 2025
- **Members:** 11 people (original test group)
- **ID:** `brazil-trip-2025`
- **Status:** Ready to test

### Group 2: Demo Group
- **Members:** Pipi, Virginia, Carlos Demo, Laura Demo
- **ID:** `demo-group`
- **Purpose:** Marketing co-founder testing
- **Note:** Virginia's email needs to be added when she provides it

### Group 3: Brazil 2026 Ingleses
- **Members:** Pipi, Gonzalo Soria, Agustin Hurtado, Conrado Romero, Chiche Gonzalez
- **ID:** `brazil-2026-ingleses`
- **Status:** Ready to test

### Phone Numbers (for ALLOWED_PHONE_NUMBERS on Render)

```
# Brazil Trip 2025 (11)
+5493794702813,+5493794702875,+5493794029833,+5493794887005,+5493794583503,+5493794229905,+5493794720969,+5493794770027,+5493794142450,+5493794625698,+5493794824341

# Demo Group (1 new)
+5493794574159

# Brazil 2026 Ingleses (4 new)
+5493794008427,+5493794335989,+5493794351114,+5493794382508
```

---

## 🔑 Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Exchange rate API | DolarApi.com | Free, has Blue Dollar, supports EUR/BRL |
| Fuzzy matching | Fuse.js | Lightweight, handles typos and accents |
| Auth | Google (Firebase Auth) | Simple, most users have Google |
| Multi-group | `activeGroupId` on user | Syncs between WhatsApp and dashboard |
| Currency display | Always ARS | Stored in ARS, original currency for reference |
| Hosting | Render (backend) + Firebase (frontend) | Free tiers, good DX |

---

## 📱 WhatsApp API Status

### Current: Test Mode
- Using Meta's test phone number
- Only ALLOWED_PHONE_NUMBERS can message the bot
- Works for testing with known friends
- Cannot scale to unknown users

### For Public Launch
- Need WhatsApp Business verification (1-4 weeks)
- Need dedicated phone number for bot
- Need approved message templates for outbound messages

---

## 🛤️ Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1-4 | ✅ Done | Security, deployment, data quality, bot commands |
| Phase 5 | ✅ Done | Dashboard UX enhancements |
| **Testing** | 🔄 Current | Test with 3 friend groups |
| Self-service | ⬜ Next | Registration, group creation UI |
| Public launch | ⬜ Future | WhatsApp verification, remove whitelist |

---

## 📁 Key File Locations

```
/client
├── composables/useAuth.ts      # Auth logic
├── stores/useExpenseStore.ts   # Expense state
├── stores/useUserStore.ts      # User state, balances
├── pages/index.vue             # Main dashboard
├── pages/profile.vue           # Profile page
└── components/                 # UI components

/server
├── src/routes/whatsapp.js      # Webhook handler
├── src/services/
│   ├── commandService.ts       # Bot commands
│   ├── expenseService.ts       # Expense CRUD
│   ├── userService.ts          # User/group queries
│   ├── mentionService.ts       # @mention matching
│   └── exchangeRateService.ts  # Currency conversion
├── src/utils/messageParser.ts  # Message parsing
├── scripts/
│   ├── seedUsers.ts            # Seed Brazil Trip 2025
│   ├── seedTestGroup.ts        # Seed Demo Group
│   ├── seedBrazil2026Group.ts  # Seed Ingleses group
│   └── updateUserEmail.ts      # Update user email

/docs
├── project-plan.md             # Development phases, session log
├── product-status.md           # Honest assessment for co-founders
├── overview.md                 # Product vision
├── deployment.md               # Deployment guide
├── adding-groups.md            # How to add test groups
└── session-handoff.md          # This file
```

---

## 🔧 Environment Variables (Render)

```env
# WhatsApp
WHATSAPP_VERIFY_TOKEN=xxx
WHATSAPP_APP_SECRET=xxx
WHATSAPP_API_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# Phone whitelist (all test users)
ALLOWED_PHONE_NUMBERS=+5493794702813,+5493794702875,...

# Firebase
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY=xxx

# Server
PORT=4000
NODE_ENV=production
```

---

## ⚠️ Known Limitations & Gotchas

1. **Cold starts on Render:** Free tier spins down after inactivity, first request can be slow

2. **WhatsApp test number:** Must manually add each phone to ALLOWED_PHONE_NUMBERS

3. **Google Auth domain:** Must add domains to Firebase Auth → Authorized Domains

4. **Multi-group users:** When user is in multiple groups, they must use `/grupo` to switch. Default is their `activeGroupId` or first group found.

5. **Emails optional:** Users can use WhatsApp without email. Email only needed for dashboard access.

6. **Argentina focus:** Currency conversion assumes ARS as target. Blue Dollar rate used.

---

## 💡 Lessons Learned

1. **WhatsApp API is not like Telegram:** You can't just let anyone message your bot. Meta controls access.

2. **The friction trade-off:** We reduced friction for expense logging but current onboarding requires developer. This is the main gap to fix.

3. **Test with real users early:** Many UX issues only surface with real usage (numbers getting cut off, confusing navigation, etc.)

4. **Documentation matters:** Keeping docs updated helped clarify product state for co-founder discussions.

---

## 📞 Useful Commands

```bash
# Run seed scripts (from /server)
npx ts-node scripts/seedUsers.ts
npx ts-node scripts/seedTestGroup.ts
npx ts-node scripts/seedBrazil2026Group.ts

# Update user email
npx ts-node scripts/updateUserEmail.ts --phone="+549..." --email="x@gmail.com"

# Deploy frontend
cd client && npm run build && firebase deploy --only hosting

# Deploy backend (auto via GitHub push to main)
git push origin main
```

---

## 🎯 Next Steps (As of December 25, 2025)

1. **Immediate:** Verify all phone numbers are in ALLOWED_PHONE_NUMBERS on Render
2. **This week:** Start testing with Brazil 2026 Ingleses group (smallest)
3. **Parallel:** Research WhatsApp Business verification process
4. **After testing:** Build self-registration and group creation features

---

## 📝 How to Update This Document

After each significant development session:
1. Update "Last updated" date
2. Add new decisions to "Key Technical Decisions"
3. Update "What's Built" and "What's NOT Built"
4. Update "Next Steps"
5. Commit to repo

This keeps the handoff document fresh for future sessions.
