/**
 * Migration script to add groupId to existing expenses
 *
 * Run with: npx tsx scripts/migrateExpenses.ts
 */

import admin from 'firebase-admin'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const GROUP_ID = 'brazil-trip-2025'

const initializeFirebase = () => {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing Firebase configuration. Check your .env file.')
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    })
  }

  return admin.firestore()
}

async function migrateExpenses(db: FirebaseFirestore.Firestore): Promise<void> {
  const expensesRef = db.collection('expenses')
  const snapshot = await expensesRef.get()

  if (snapshot.empty) {
    console.log('No expenses found.')
    return
  }

  console.log(`Found ${snapshot.size} expenses total.`)

  // Count expenses without groupId
  const expensesWithoutGroupId = snapshot.docs.filter(doc => !doc.data().groupId)

  if (expensesWithoutGroupId.length === 0) {
    console.log('All expenses already have groupId. Nothing to migrate.')
    return
  }

  console.log(`${expensesWithoutGroupId.length} expenses need migration.`)
  console.log(`Adding groupId: "${GROUP_ID}" to all...`)

  // Firestore batch limit is 500
  const batchSize = 500
  let updated = 0

  for (let i = 0; i < expensesWithoutGroupId.length; i += batchSize) {
    const batch = db.batch()
    const chunk = expensesWithoutGroupId.slice(i, i + batchSize)

    chunk.forEach(doc => {
      batch.update(doc.ref, { groupId: GROUP_ID })
    })

    await batch.commit()
    updated += chunk.length
    console.log(`  Updated ${updated}/${expensesWithoutGroupId.length}`)
  }

  console.log(`\n✅ Migration complete! ${updated} expenses updated.`)
}

async function main() {
  console.log('\n=== Expense Migration Script ===\n')

  const db = initializeFirebase()
  await migrateExpenses(db)

  process.exit(0)
}

main().catch(error => {
  console.error('Migration failed:', error)
  process.exit(1)
})
