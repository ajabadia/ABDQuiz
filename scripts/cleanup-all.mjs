/**
 * 🧹 Cleanup Script: ABDQuiz — Full Database Reset
 *
 * Drops all documents/collections related to ABDQuiz.
 * Safe for testing environments — completely wipes:
 *   ExamAttempt, ExamAssignment, ExamConfig, Question,
 *   QuizUserRole, Course, CorpusImport, CorpusImportRow,
 *   Allegation, contenthashes (legacy), users_quiz (legacy)
 *
 * Usage: node scripts/cleanup-all.mjs
 *        node scripts/cleanup-all.mjs --tenant <tenantId>  (specific tenant prefix)
 *        node scripts/cleanup-all.mjs --all                 (all tenants)
 *        node scripts/cleanup-all.mjs --drop-collections    (drop collections instead of deleteMany)
 */

import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config ---
const ABDQUIZ_COLLECTIONS = [
  'examattempts',
  'examassignments',
  'examconfigs',
  'questions',
  'quizuserroles',
  'courses',
  'corpusimports',
  'corpusimportrows',
  'allegations',
  'contenthashes',
  'users_quiz',
];

// --- Load .env.local manually (no dotenv dependency) ---
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const value = trimmed.substring(eqIdx + 1).trim();
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || 'abd_global';
const ISOLATION_STRATEGY = process.env.ISOLATION_STRATEGY || 'COLLECTION_PREFIX';

// --- CLI Args ---
const args = process.argv.slice(2);
const tenantArgIdx = args.indexOf('--tenant');
const tenantId = tenantArgIdx !== -1 ? args[tenantArgIdx + 1] : DEFAULT_TENANT;
const wipeAllTenants = args.includes('--all');
const dropCollections = args.includes('--drop-collections');

// --- Build collection name candidates ---
function buildCollectionCandidates(tid) {
  const candidates = [];
  // Unprefixed (legacy / shared)
  for (const coll of ABDQUIZ_COLLECTIONS) {
    candidates.push(coll);
  }
  // Prefixed (COLLECTION_PREFIX strategy)
  if (tid) {
    const prefix = tid.replace(/[^a-zA-Z0-9_]/g, '_');
    for (const coll of ABDQUIZ_COLLECTIONS) {
      candidates.push(`${prefix}_${coll}`);
    }
  }
  return [...new Set(candidates)]; // deduplicate
}

async function cleanup() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('🧹 ABDQuiz — Full Cleanup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`🔑 Tenant:       ${wipeAllTenants ? 'ALL TENANTS' : tenantId}`);
  console.log(`📐 Strategy:     ${ISOLATION_STRATEGY}`);
  console.log(`🗑️  Mode:         ${dropCollections ? 'DROP COLLECTIONS' : 'DELETE DOCUMENTS'}`);
  console.log('');

  try {
    // Connect to default database
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log(`✅ Connected to database: ${db.databaseName}`);
    console.log('');

    // Get all actual collections in the database
    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(existingCollections.map((c) => c.name));
    console.log(`📋 Found ${existingCollections.length} collections in database`);

    // Determine which collection names to target
    let targetNames;
    if (wipeAllTenants) {
      // Find all collections that match any ABDQUIZ collection name
      targetNames = existingNames.filter((name) => {
        const lower = name.toLowerCase();
        return ABDQUIZ_COLLECTIONS.some((c) => lower === c || lower.endsWith(`_${c}`));
      });
    } else {
      targetNames = buildCollectionCandidates(tenantId).filter((name) =>
        existingNames.has(name)
      );
    }

    targetNames.sort();
    console.log(`🎯 Target collections: ${targetNames.length}`);
    targetNames.forEach((n) => console.log(`   • ${n}`));
    console.log('');

    if (targetNames.length === 0) {
      console.log('⚠️  No matching collections found. Nothing to clean up.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Execute cleanup
    let totalDeleted = 0;
    for (const collName of targetNames) {
      const collection = db.collection(collName);

      if (dropCollections) {
        try {
          await collection.drop();
          console.log(`   ✅ Dropped collection: ${collName}`);
        } catch (err) {
          console.error(`   ❌ Failed to drop ${collName}:`, err.message);
        }
      } else {
        const result = await collection.deleteMany({});
        totalDeleted += result.deletedCount || 0;
        console.log(`   🗑️  ${collName}: ${result.deletedCount} documents deleted`);
      }
    }

    console.log('');
    if (dropCollections) {
      console.log('✅ All matching collections dropped successfully.');
    } else {
      console.log(`✅ Cleanup complete. Total documents deleted: ${totalDeleted}`);
    }

    // If DATABASE_PER_TENANT strategy, also try the tenant-specific database
    if (ISOLATION_STRATEGY === 'DATABASE_PER_TENANT' && !wipeAllTenants) {
      const tenantDbName = `abd_tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      console.log('');
      console.log(`📂 Trying tenant-specific database: ${tenantDbName}`);

      try {
        const tenantDb = mongoose.connection.useDb(tenantDbName);
        const tenantCollections = await tenantDb.listCollections().toArray();

        for (const info of tenantCollections) {
          const collName = info.name;
          const lower = collName.toLowerCase();
          if (ABDQUIZ_COLLECTIONS.some((c) => lower === c || lower.endsWith(`_${c}`))) {
            if (dropCollections) {
              await tenantDb.collection(collName).drop();
              console.log(`   ✅ Dropped ${tenantDbName}/${collName}`);
            } else {
              const result = await tenantDb.collection(collName).deleteMany({});
              totalDeleted += result.deletedCount || 0;
              console.log(`   🗑️  ${tenantDbName}/${collName}: ${result.deletedCount} documents deleted`);
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Could not access tenant database: ${err.message}`);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 Cleanup finished.');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
