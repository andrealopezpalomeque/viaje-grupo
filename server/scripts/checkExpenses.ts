/**
 * Debug script to check expense groupIds and user/group relationships
 */

import admin from 'firebase-admin'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const initializeFirebase = () => {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
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

async function main() {
  const db = initializeFirebase()

  // Check groups and their members
  console.log('\n=== Groups ===')
  const groups = await db.collection('groups').get()
  for (const doc of groups.docs) {
    const data = doc.data()
    console.log(`  ID: "${doc.id}", Name: "${data.name}"`)
    console.log(`  Members (${data.members?.length || 0}): ${JSON.stringify(data.members)}`)
  }

  // Check users
  console.log('\n=== Users ===')
  const users = await db.collection('users').get()
  users.docs.forEach(doc => {
    const data = doc.data()
    console.log(`  ID: "${doc.id}", Name: "${data.name}", Phone: "${data.phone}"`)
  })

  // Check if users are in group members array
  console.log('\n=== User-Group Membership Check ===')
  const group = groups.docs[0]
  const groupMembers = group?.data().members || []

  users.docs.forEach(doc => {
    const isInGroup = groupMembers.includes(doc.id)
    console.log(`  ${doc.data().name}: ${isInGroup ? '✅ in group' : '❌ NOT in group'}`)
  })

  // Check expenses
  console.log('\n=== Expenses (last 5) ===')
  const expenses = await db.collection('expenses').orderBy('timestamp', 'desc').limit(5).get()
  expenses.docs.forEach(doc => {
    const data = doc.data()
    console.log(`  groupId="${data.groupId}", desc="${data.description}", userId="${data.userId}"`)
  })

  process.exit(0)
}

main().catch(console.error)
