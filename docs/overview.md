# Text the Check - Product Overview

## The Problem

Splitting expenses with friends during trips or shared activities is a solved problem — apps like Splitwise, Tricount, and Settle Up exist. But they all share the same friction:

**Everyone needs to download the app, create an account, and join the group.**

In practice, this means:
- The "accountant friend" downloads Splitwise
- They try to get 10 people to install it
- 3 people never do
- Someone ends up tracking everything in a notes app anyway

The result: friction kills adoption. People revert to messy spreadsheets, WhatsApp messages saying "I paid for lunch, you owe me", and awkward end-of-trip settlements.

## The Solution

**Text the Check** takes a different approach:

> Log expenses where you're already coordinating — WhatsApp.

Instead of asking everyone to download an app:
1. **One person** adds the bot to their contacts
2. They text expenses naturally: `50 taxi @Juan @Maria`
3. Everyone can view balances on a simple web dashboard
4. At the end, copy payment details and settle however you want

**Zero app downloads. Zero account creation for participants. Zero friction.**

## How It Works

### For the person logging expenses (WhatsApp)
```
50 lunch                     → Splits among everyone
USD 20 dinner @Ana @Pedro    → Converts to ARS, splits among 3
/balance                     → See who owes whom
/lista                       → See recent expenses
```

### For everyone else (Web Dashboard)
- View real-time expense feed
- See your personal balance
- Check settlement recommendations
- Copy payment details (CBU, alias, etc.) to transfer

### Settlement
The app is **payment-method agnostic**. Users can add their preferred payment info:
- Bank CBU/CVU
- Bank alias
- Mercado Pago
- Any platform

When it's time to settle, the dashboard shows who pays whom, with a copy button for payment details. You settle however you normally transfer money to friends.

## Target Users

**Primary:** Friend groups traveling together (5-15 people)
- Already coordinating via WhatsApp
- Mixed willingness to install apps
- Need transparency on shared expenses
- Will settle via bank transfer / Mercado Pago / cash

**Secondary:**
- Roommates splitting bills
- Couples with shared expenses
- Small groups organizing events (asados, parties)

## Competitive Landscape

### Traditional Apps (Splitwise, Tricount, Settle Up)
- ✅ Full-featured expense tracking
- ✅ Settlement recommendations
- ❌ Requires everyone to download and create accounts
- ❌ Friction kills adoption in casual groups

### WhatsApp-First Competitors (Pango, Lanly, Whispend)
- ✅ WhatsApp native entry
- ✅ Lower friction
- ❌ Most are English-first, US-focused
- ❌ Don't understand LATAM payment culture (CBU, alias, MP)

### Text the Check
- ✅ WhatsApp native entry
- ✅ Real-time web dashboard
- ✅ Spanish-first experience
- ✅ LATAM payment details (CBU, CVU, alias, Mercado Pago)
- ✅ Multi-currency for travel (USD, EUR, BRL → ARS)
- ✅ Zero friction for non-logging participants

## Why LATAM / Argentina

This isn't a limitation — it's a wedge:

1. **WhatsApp dominance** — Argentina is one of the highest WhatsApp-usage countries globally
2. **Payment culture** — People settle via "pasame por MP" or "te transfiero al CBU"
3. **Travel patterns** — Groups traveling to Brazil, Uruguay, Chile need multi-currency
4. **Competition gap** — US-based competitors won't prioritize Argentine banking

A US-based team building for Venmo/Zelle users won't invest in CBU/alias support. We already have it.

## What's Built (Production Ready)

### WhatsApp Bot
- [x] Natural language expense entry (`50 lunch`)
- [x] Multi-currency conversion (USD, EUR, BRL → ARS with live rates)
- [x] @mention splitting with fuzzy name matching
- [x] Commands: `/ayuda`, `/balance`, `/lista`, `/borrar`
- [x] Auto-categorization (food, transport, accommodation, etc.)
- [x] Message deduplication and rate limiting

### Web Dashboard
- [x] Google Authentication (linked to pre-registered users)
- [x] Real-time expense feed (Firebase Firestore)
- [x] Personal balance view with breakdown
- [x] Group balance overview
- [x] Settlement recommendations (who pays whom)
- [x] Payment info display with copy-to-clipboard
- [x] User profiles with editable payment details
- [x] Mobile-first responsive design
- [x] Dark mode support

### Infrastructure
- [x] Express.js backend on Render
- [x] Nuxt.js frontend on Firebase Hosting
- [x] Firebase Firestore for real-time sync
- [x] Webhook signature verification
- [x] Firestore security rules

## What's Planned (Backlog)

- [ ] Receipt/image upload with OCR parsing
- [ ] Public view-only balance links (shareable without login)
- [ ] Export to CSV/PDF
- [ ] User-configurable settlement algorithms
- [ ] Weight-based splitting ("this person eats more")
- [ ] Couples as single entity option
- [ ] Monthly summary reports

## Success Signals to Watch

When testing with friend groups, these indicate product-market fit:

1. **Repeat usage** — Do groups keep using it after the first weekend?
2. **Retention after settlement** — Do they reuse it for another trip?
3. **Organic invites** — Do users add the bot to new groups without prompting?

## Live URLs

| Service | URL |
|---------|-----|
| Dashboard | https://textthecheck.app |
| Backend API | https://viaje-grupo-server.onrender.com (legacy URL) |

---

## Technical Documentation

For implementation details, see:
- [Project Plan](./project-plan.md) — Development phases and session log
- [Deployment Guide](./deployment.md) — Production deployment checklist
- [Google Auth Setup](./google-auth.md) — Authentication configuration
- [Firestore Security](./firestore-security.md) — Security rules
- [Splitting Logic](./splitting-logic.md) — Balance calculation algorithm
- [Icon Usage](./icons.md) — Frontend icon system

## Tech Stack Summary

- **Frontend:** Nuxt 4 (Vue 3) + Tailwind CSS + Pinia
- **Backend:** Node.js + Express
- **Database:** Firebase Firestore (real-time sync)
- **Auth:** Firebase Authentication (Google)
- **Bot:** WhatsApp Business API
