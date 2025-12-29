# AI Natural Language Processing - Strategic Decision

**Decision Date:** December 2025
**Status:** Implementation Phase 1

---

## Why This Makes Sense Now

### The Core Problem

Our whole thesis is "reduce friction." But making users learn a syntax IS friction.

| Current (Rigid Syntax) | Result |
|------------------------|--------|
| `150 pizza` | ✅ Works |
| `USD 50 cena @Juan @Maria` | ✅ Works |
| `Gasté 150 en pizza` | ❌ Fails |
| `Pagué un taxi 200p` | ❌ Fails |
| `50 dólares la cena con juan` | ❌ Fails |
| `Le di 5 lucas a Maru` | ❌ Fails |

### Why Now?

| Reason | Explanation |
|--------|-------------|
| **Core goal alignment** | Reduce friction is our thesis - syntax is friction |
| **Small user base** | Beta = low API costs while we experiment |
| **Real user feedback** | We'll quickly learn what people actually type |
| **Competitive advantage** | Most expense apps don't do this |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  USER MESSAGE                                               │
│  "Gasté 50 dólares en la cena, dividan entre juan y mari"   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  AI LAYER (Gemini Flash)                                    │
│                                                             │
│  Input: User message + group member names for context       │
│                                                             │
│  Output (structured JSON):                                  │
│  {                                                          │
│    "type": "expense" | "payment" | "command" | "unknown",   │
│    "amount": 50,                                            │
│    "currency": "USD" | "ARS" | "BRL" | "EUR",               │
│    "description": "cena",                                   │
│    "splitAmong": ["juan", "mari"],                          │
│    "confidence": 0.95                                       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXISTING LOGIC (unchanged)                                 │
│  - Resolve mentions (mentionService)                        │
│  - Convert currency (exchangeRateService)                   │
│  - Create expense/payment (expenseService/paymentService)   │
│  - Send confirmation (whatsappService)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Always Confirm Interpretation

Critical with AI - always show what was understood:

```
User: "50 dol cena con juancho y la mari"
Bot: ✅ Gasto registrado
     💵 USD 50 → $52.500
     📝 Cena
     👥 Juancho, Mari
     📁 Brazil Trip 2025

     ¿Algo mal? Respondé "deshacer"
```

### 2. Confidence Threshold

If AI confidence < 0.7, ask for clarification:

```
User: "150"
Bot: 🤔 No entendí bien. ¿Qué fue ese gasto?
     Ejemplo: "150 taxi" o "150 almuerzo"
```

### 3. Hybrid Approach (Safety Net)

1. Try AI interpretation first
2. If AI fails or times out (>5s) → fall back to regex parser
3. Log everything for debugging and improvement

### 4. Commands Stay Unchanged

Slash commands (`/balance`, `/grupo`, `/ayuda`, etc.) bypass AI entirely - they're already unambiguous.

---

## Cost Estimation

Using Gemini 1.5 Flash:

| Scenario | Messages/month | Estimated Cost |
|----------|---------------|----------------|
| 1 active trip, 5 people | ~200 | $0.02 |
| 3 active trips, 15 people | ~600 | $0.06 |
| 10 active trips, 50 people | ~2000 | $0.20 |
| 100 active trips (growth!) | ~20000 | $2.00 |

**Verdict: Cost is negligible.** Even at scale, dollars per month.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI hallucinates amounts | Always show confirmation, "deshacer" command |
| AI is slow/unavailable | Fallback to regex parser, 5s timeout |
| Costs spike unexpectedly | Billing alerts, rate limit per user |
| AI misunderstands slang | Argentine slang in system prompt |
| Privacy concerns | No message content stored in AI logs |

---

## Phased Implementation

### Phase 1: Expenses Only (Current)
- [x] AI parses expense messages
- [x] Existing commands unchanged
- [x] Fallback to regex if AI fails
- [ ] Test with beta groups

### Phase 2: Payments
- [ ] AI recognizes "pagué", "le di", "transferí"
- [ ] Same confirmation flow

### Phase 3: Smart Features (Future)
- [ ] "¿Cuánto le debo a Juan?" → AI answers from balance
- [ ] "Borrar el último" → AI understands context
- [ ] Multi-message context

---

## Technical Details

### Provider: Google Gemini 1.5 Flash
- **Model:** `gemini-1.5-flash`
- **Why:** Cheapest, fast (~800ms), good structured output
- **Fallback:** Regex parser (existing messageParser.ts)

### Environment Variables

```
GEMINI_API_KEY=your_api_key_here
AI_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.7
AI_TIMEOUT_MS=5000
```

### New Files
- `server/src/services/aiService.ts` - Gemini integration
- `server/src/prompts/expenseExtraction.ts` - System prompts

### Modified Files
- `server/src/routes/whatsapp.js` - AI integration in message flow
- `server/src/utils/messageParser.ts` - Add fallback flag

---

## Argentine Spanish Considerations

The AI prompt includes these local terms:

| Slang | Meaning |
|-------|---------|
| lucas, luquitas | thousands (5 lucas = 5000) |
| mangos | pesos |
| 5k, 10k | 5000, 10000 |
| guita | money |
| morfi | food |
| birra | beer |
| dólar blue | informal USD rate |

---

## Success Metrics

1. **Parse success rate:** % of messages AI correctly interprets (target: >90%)
2. **Fallback rate:** % of messages falling back to regex (target: <10%)
3. **User corrections:** How often users use "deshacer" (target: <5%)
4. **Latency:** Average AI response time (target: <1.5s)

---

## Changelog

| Date | Change |
|------|--------|
| Dec 2025 | Initial implementation (Phase 1) |
