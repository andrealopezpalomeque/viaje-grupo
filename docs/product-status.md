# Text the Check - Product Status (Honest Assessment)

**Last updated:** December 24, 2025

This document explains exactly where the product is, what works, what doesn't, and what's needed for public launch. Written for potential co-founders and collaborators who need the full picture.

---

## What We Have: A Working MVP in Closed Beta

The core product works. Real expenses can be tracked via WhatsApp, balances are calculated correctly, and the dashboard shows everything in real-time.

**But:** New users cannot sign up on their own. Every user and group must be manually created by a developer.

---

## Current User Flow (Closed Beta)

Developer (me) must:

1. Add user's phone number to environment variable (ALLOWED_PHONE_NUMBERS)
2. Run a seed script to create user in database
3. Run a seed script to create group with members
4. Share the WhatsApp test number with friends

Then users can:

1. Save the bot number in their contacts
2. Text expenses to the bot
3. View dashboard at textthecheck.app (if they have Google email registered)

**This is fine for testing with known friend groups. This does not scale.**

---

## What's Fully Working

### WhatsApp Bot
- Natural language expense entry (`100 taxi`, `USD 50 dinner @Juan @Maria`)
- Multi-currency conversion (USD, EUR, BRL -> ARS with live rates)
- @mention splitting with fuzzy name matching
- Commands: `/ayuda`, `/balance`, `/lista`, `/borrar`, `/grupo`
- Auto-categorization (food, transport, accommodation, etc.)
- Multi-group support (users can switch between groups)
- Security: webhook signature verification, rate limiting

### Web Dashboard
- Google Authentication
- Real-time expense feed
- Personal balance view ("Tu Resumen")
- Group balance overview
- Settlement recommendations (who pays whom)
- Payment info with copy-to-clipboard
- User profiles with editable payment details
- Group selector (for users in multiple groups)
- Mobile-first responsive design

### Infrastructure
- Backend deployed on Render (Node.js/Express)
- Frontend deployed on Firebase Hosting (Nuxt.js)
- Database on Firebase Firestore (real-time sync)
- Custom domain: textthecheck.app

---

## What's NOT Built Yet

### Critical for Public Launch

| Feature | Why It's Needed |
|---------|-----------------|
| Self-registration | Users can't create accounts themselves |
| Group creation UI | Groups must be created via database scripts |
| Friend invitation flow | Can't add friends without developer intervention |
| Remove phone whitelist | Currently only pre-approved phones can use bot |

### Nice to Have (Not Critical)

| Feature | Status |
|---------|--------|
| Receipt/image upload | Not started |
| Export to CSV/PDF | Not started |
| Public shareable balance links | Not started |
| WhatsApp-based onboarding | Not started |

---

## WhatsApp Business API Reality

### Current Setup (Test Mode)
- Using Meta's test phone number
- Only works for phone numbers in ALLOWED_PHONE_NUMBERS
- Fine for testing with known friends
- Cannot scale to unknown users

### For Public Launch (Need to Do)
- Apply for WhatsApp Business API verification
- Get a dedicated phone number for the bot
- Get approved for messaging templates
- This process can take days to weeks

### What This Means
Random users cannot use the bot today. They would need to:
1. Contact us
2. We manually add their phone number
3. We manually create their account and group

This is the main blocker for public launch.

---

## Realistic Path to Public Launch

### Phase 1: Closed Beta Testing (Current)
- Test with 3 manually-created friend groups
- Collect feedback on core experience
- Fix bugs found during real usage
- No new features, just validation

### Phase 2: Build Self-Service Features
- Self-registration on website (Google sign-up)
- Group creation UI (create group, add friends by phone)
- Friend invitation system
- Automatic phone number authorization

### Phase 3: WhatsApp Verification (Parallel with Phase 2)
- Apply for WhatsApp Business verification
- Get dedicated phone number
- Set up approved message templates
- Timeline depends on Meta

### Phase 4: Public Launch
- Remove phone whitelist
- Anyone can sign up and create groups
- Friends receive WhatsApp invitations
- Marketing can begin

---

## The Friction We're Solving vs. Creating

### Original Problem (Splitwise)
> Everyone must download app + create account + join group

### Our Solution (Public Launch Target)
> ONE person creates group on website, adds friends by phone number.
> Friends just save a number and text. No app download. No account creation.

### Current State (Closed Beta)
> Developer manually sets up everything. Users just text.
> (Good for testing, doesn't scale)

---

## Honest Summary

**What we have:** A working product that real people can use to split expenses via WhatsApp.

**What we don't have:** A way for new users to start using it without developer help.

**What we need to build:** Self-service registration and group creation.

**What we need from Meta:** WhatsApp Business verification for public access.

---

## Questions for Co-founder Discussion

1. Are we okay testing manually with friend groups for the next month?
2. Who handles the WhatsApp Business verification process?
3. What's our launch strategy once self-service is built?
4. Do we need landing page / marketing site before public launch?
5. How do we want to handle the first 100 users?
