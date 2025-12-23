/**
 * Seed script for Text the Check unified user system
 *
 * This script:
 * 1. Deletes all existing documents in 'users' collection
 * 2. Creates 11 users with proper structure (id, name, phone, email, aliases, createdAt)
 * 3. Creates a 'groups' collection with Brazil Trip 2025
 * 4. Updates existing expenses to add groupId
 *
 * Run with: npx tsx scripts/seedUsers.ts
 */

import admin from 'firebase-admin'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from server root
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// Initialize Firebase Admin
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

    console.log('Firebase Admin initialized')
  }

  return admin.firestore()
}

// User data to seed
interface SeedUser {
  name: string
  phone: string
  email: string | null
  aliases: string[]
}

const USERS_TO_SEED: SeedUser[] = [
  {
    name: 'Pipi López Palomeque',
    phone: '+5493794702813',
    email: 'andrealopezpalomeque@gmail.com',
    aliases: ['pipi']
  },
  {
    name: 'Sofia López Palomeque',
    phone: '+5493794702875',
    email: 'msofiarriiuca@gmail.com',
    aliases: ['sofia', 'sofi', 'popy', 'popi']
  },
  {
    name: 'Agustina Carbajal',
    phone: '+5493794029833',
    email: null,
    aliases: ['agustina', 'agus', 'carbajal']
  },
  {
    name: 'Lisandro Solimano',
    phone: '+5493794887005',
    email: null,
    aliases: ['lisandro', 'lichi']
  },
  {
    name: 'Valentina Glombosky',
    phone: '+5493794583503',
    email: null,
    aliases: ['valentina', 'valen']
  },
  {
    name: 'Benjamin Speroni',
    phone: '+5493794229905',
    email: null,
    aliases: ['benjamin', 'benja']
  },
  {
    name: 'Maria Jose Ferreyra',
    phone: '+5493794720969',
    email: null,
    aliases: ['majo']
  },
  {
    name: 'Delfina Amarilla',
    phone: '+5493794770027',
    email: null,
    aliases: ['delfina', 'delfi']
  },
  {
    name: 'Angel Cuzziol',
    phone: '+5493794142450',
    email: null,
    aliases: ['angel']
  },
  {
    name: 'Facundo Perez Cortes',
    phone: '+5493794625698',
    email: null,
    aliases: ['facundo', 'facu']
  },
  {
    name: 'Julian Montenegro',
    phone: '+5493794824341',
    email: null,
    aliases: ['julian']
  }
]

const GROUP_ID = 'brazil-trip-2025'

async function deleteCollection(db: FirebaseFirestore.Firestore, collectionName: string): Promise<number> {
  const collectionRef = db.collection(collectionName)
  const snapshot = await collectionRef.get()

  if (snapshot.empty) {
    console.log(`  No documents in '${collectionName}' to delete`)
    return 0
  }

  const batch = db.batch()
  snapshot.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()

  console.log(`  Deleted ${snapshot.size} documents from '${collectionName}'`)
  return snapshot.size
}

async function seedUsers(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const usersRef = db.collection('users')
  const userIds: string[] = []
  const batch = db.batch()

  for (const userData of USERS_TO_SEED) {
    const docRef = usersRef.doc() // Auto-generate ID
    const userId = docRef.id
    userIds.push(userId)

    batch.set(docRef, {
      id: userId,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      aliases: userData.aliases,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    console.log(`  Created user: ${userData.name} (${userId})`)
  }

  await batch.commit()
  return userIds
}

async function createGroup(db: FirebaseFirestore.Firestore, memberIds: string[], creatorId: string): Promise<void> {
  const groupRef = db.collection('groups').doc(GROUP_ID)

  await groupRef.set({
    id: GROUP_ID,
    name: 'Brazil Trip 2025',
    members: memberIds,
    createdBy: creatorId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log(`  Created group: Brazil Trip 2025 (${GROUP_ID}) with ${memberIds.length} members`)
}

async function updateExpenses(db: FirebaseFirestore.Firestore): Promise<number> {
  const expensesRef = db.collection('expenses')
  const snapshot = await expensesRef.get()

  if (snapshot.empty) {
    console.log('  No expenses to update')
    return 0
  }

  const batch = db.batch()
  let updateCount = 0

  snapshot.docs.forEach(doc => {
    const data = doc.data()
    // Only update if groupId is not already set
    if (!data.groupId) {
      batch.update(doc.ref, { groupId: GROUP_ID })
      updateCount++
    }
  })

  if (updateCount > 0) {
    await batch.commit()
    console.log(`  Updated ${updateCount} expenses with groupId: ${GROUP_ID}`)
  } else {
    console.log('  All expenses already have groupId')
  }

  return updateCount
}

async function main() {
  console.log('\n=== Text the Check Seed Script ===\n')

  const db = initializeFirebase()

  // Step 1: Delete existing users
  console.log('Step 1: Deleting existing users...')
  await deleteCollection(db, 'users')

  // Step 2: Delete existing groups (to start fresh)
  console.log('\nStep 2: Deleting existing groups...')
  await deleteCollection(db, 'groups')

  // Step 3: Create new users
  console.log('\nStep 3: Creating 11 users...')
  const userIds = await seedUsers(db)

  // Step 4: Create group (Pipi is the creator - first user)
  console.log('\nStep 4: Creating Brazil Trip 2025 group...')
  await createGroup(db, userIds, userIds[0])

  // Step 5: Update existing expenses
  console.log('\nStep 5: Updating existing expenses...')
  await updateExpenses(db)

  console.log('\n=== Seed Complete! ===\n')
  console.log('Summary:')
  console.log(`  - ${userIds.length} users created`)
  console.log(`  - 1 group created (${GROUP_ID})`)
  console.log('\nDon\'t forget to update ALLOWED_PHONE_NUMBERS in .env with all 11 phone numbers!')
  console.log('\nPhone numbers to add:')
  USERS_TO_SEED.forEach(user => {
    console.log(`  ${user.phone} (${user.name})`)
  })

  process.exit(0)
}

main().catch(error => {
  console.error('Seed script failed:', error)
  process.exit(1)
})
