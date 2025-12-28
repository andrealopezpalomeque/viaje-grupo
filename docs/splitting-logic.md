# Smart Splitting Logic

This document explains how Text the Check calculates who owes whom.

## 1. The Core Variable: `splitAmong`
Every expense has a field called `splitAmong`. This is a list of User IDs derived from @mentions in the WhatsApp message, or from checkbox selection in the web dashboard.

## 2. Input Rules

### WhatsApp
The parser scans the message for `@Mentions`.

| Message | Parsed `splitAmong` | Who Splits |
| :--- | :--- | :--- |
| `2000 Sushi` | `[]` (Empty) | **Everyone** in the group |
| `2000 Sushi @Juan @Maria` | `['Juan', 'Maria']` | **Only Juan & Maria** (2 people) |
| `2000 Sushi @Pipi @Juan @Maria` | `['Pipi', 'Juan', 'Maria']` | **Pipi, Juan & Maria** (3 people) |

> **Key Rule:** The payer is **NOT** automatically added to the split. If you want to include yourself in a split expense, you must mention yourself explicitly.
>
> **Use Case:** This allows someone to log expenses on behalf of others. For example, if Pipi pays for Juan and Maria's lunch (and doesn't eat), Pipi can log: `2000 Almuerzo @Juan @Maria` - and only Juan and Maria will owe Pipi.

### Web Dashboard
When adding an expense via the dashboard:
- No participants are pre-selected by default
- You must explicitly check the boxes for everyone who participates
- The same rule applies: if you want to be included, check your own name

## 3. Calculation Algorithm
The balance calculation iterates through every expense:

1.  **Identify Participants:**
    *   If `splitAmong` is empty -> Participants = **All group members**.
    *   If `splitAmong` has users -> Participants = **Only those specified users**.

2.  **Calculate Share:**
    *   `Share = Amount / Count(Participants)`

3.  **Update Balances:**
    *   **Payer:** `Paid += Amount`
    *   **Participants:** `Share += Share` (each participant's share)

### Example Scenario 1: Payer included in split
*   **Users:** Pipi, Nico, Juani.
*   **Action:** Pipi pays $3000 for "Cena @Pipi @Nico @Juani".
*   **Math:**
    *   Payer: Pipi.
    *   Mentions: Pipi, Nico, Juani.
    *   Participants: 3 people.
    *   Cost per person: $1000.
*   **Result:**
    *   Pipi: Paid $3000, Share $1000. **Net: +$2000** (Owed back).
    *   Nico: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).
    *   Juani: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).

### Example Scenario 2: Payer NOT included (paying for others)
*   **Users:** Pipi, Nico, Juani.
*   **Action:** Pipi pays $2000 for "Regalo @Nico @Juani" (gift for them, Pipi doesn't get one).
*   **Math:**
    *   Payer: Pipi.
    *   Mentions: Nico, Juani (Pipi NOT mentioned).
    *   Participants: 2 people (only Nico and Juani).
    *   Cost per person: $1000.
*   **Result:**
    *   Pipi: Paid $2000, Share $0. **Net: +$2000** (Owed back in full).
    *   Nico: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).
    *   Juani: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).

### Example Scenario 3: No mentions (everyone splits)
*   **Users:** Pipi, Nico, Juani.
*   **Action:** Pipi pays $3000 for "Taxi" (no @mentions).
*   **Math:**
    *   Payer: Pipi.
    *   Mentions: None.
    *   Participants: Everyone (3 people).
    *   Cost per person: $1000.
*   **Result:**
    *   Pipi: Paid $3000, Share $1000. **Net: +$2000** (Owed back).
    *   Nico: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).
    *   Juani: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).

## 4. Edge Cases
*   **Unknown Names:** If you type `@Unknown`, the system ignores it. If no valid users are found in the mentions, it falls back to **Everyone**.
*   **Self-Mention:** If you want to be included in a split expense, you must explicitly mention yourself (e.g., `@Pipi`).
*   **Empty Web Selection:** On the dashboard, you must select at least one participant or the form won't submit.

## 5. Payments (Settling Debts)

Payments represent real money transfers between users to settle debts. Unlike expenses, payments directly reduce what one person owes another.

### Recording Payments

Payments can be recorded via:

**WhatsApp:**
| Command | Meaning |
| :--- | :--- |
| `pagué 5000 @Maria` | I paid 5000 to Maria |
| `recibí 5000 @Juan` | I received 5000 from Juan |

**Dashboard:**
- Click the payment button on a settlement recommendation
- Confirm the payment amount

### How Payments Affect Balances

Payments are factored into balance calculations after expenses are processed:

1. **Calculate expense-based balances** (as described in Section 3)
2. **Apply payment adjustments:**
   - Payment **from** A **to** B: A's net balance increases, B's net balance decreases
   - This reflects that A has partially or fully settled their debt to B

### Example with Payments

*   **Starting State (from expenses):**
    *   Nico owes Pipi $2000

*   **Action:** Nico pays Pipi $1000 (bank transfer) and records: `pagué 1000 @Pipi`

*   **Result:**
    *   Nico's debt reduced: Now owes Pipi **$1000** (was $2000)
    *   Pipi is owed less: Is owed **$1000** (was $2000)

### Who Can Record Payments

Either party involved in a payment can record it:
- The person who paid (using `pagué`)
- The person who received (using `recibí`)

When a payment is recorded, the other party receives a WhatsApp notification informing them of the recorded payment.

### Settlement Recommendations

The dashboard shows optimized settlement recommendations that consider:
1. Current expense-based balances
2. Payments already made

If Nico originally owed Pipi $2000 and already paid $1000, the settlement recommendation will show: "Nico → Pipi: $1000" (the remaining balance).
