# Smart Splitting Logic

This document explains how Text the Check calculates who owes whom.

## 1. The Core Variable: `splitAmong`
Every expense now has a field called `splitAmong`. This is a list of User IDs (or Names) derived from the WhatsApp message.

## 2. Input Rules (WhatsApp)
The parser scans the message for `@Mentions`.

| Message | Parsed `splitAmong` | Logic |
| :--- | :--- | :--- |
| `2000 Sushi` | `[]` (Empty) | **Everyone** splits this. |
| `2000 Sushi @Pipi` | `['Pipi']` | **Pipi + Payer** split this. |
| `2000 Gift @Juani @Nico` | `['Juani', 'Nico']` | **Juani + Nico + Payer** split this. |

> **Rule:** The Payer (User who sent the message) is **ALWAYS** added to the split group, unless they are already explicitly mentioned. This assumes that if you pay for a shared activity (Dinner, Taxi), you participated in it.

## 3. Calculation Algorithm
The balance calculation iterates through every expense:

1.  **Identify Participants:**
    *   If `splitAmong` is empty -> Participants = **All 11 Users**.
    *   If `splitAmong` has names -> Participants = **Matched Users + Payer**.

2.  **Calculate Share:**
    *   `Share = Amount / Count(Participants)`

3.  **Update Balances:**
    *   **Payer:** `Paid += Amount`
    *   **Participants (including Payer):** `Share += Share`

### Example Scenario
*   **Users:** Pipi, Nico, Juani.
*   **Action:** Pipi pays $3000 for "Dinner @Nico @Juani".
*   **Math:**
    *   Payer: Pipi.
    *   Mentions: Nico, Juani.
    *   Participants: Pipi (Payer) + Nico + Juani = 3 people.
    *   Cost per person: $1000.
*   **Result:**
    *   Pipi: Paid $3000, Share $1000. **Net: +$2000** (Owed back).
    *   Nico: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).
    *   Juani: Paid $0, Share $1000. **Net: -$1000** (Owes Pipi).

## 4. Edge Cases
*   **Unknown Names:** If you type `@Unknown`, the system currently ignores it. If no valid users are found in the mentions, it falls back to **Everyone**.
*   **Self-Mention:** If Pipi types `@Pipi`, it's valid but redundant (since Payer is always included).
