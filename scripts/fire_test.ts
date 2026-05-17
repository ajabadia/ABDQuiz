import fs from 'fs';
import connectDB from '../src/lib/database/mongodb';
import { CorpusImporter } from '../src/services/corpus/CorpusImporter';
import Question from '../src/models/Question';

async function fireTest() {
  await connectDB();
  const userId = 'admin_system_test';
  const tenantId = 'abd_global';

  console.log('\n--- 🔥 ACID TEST START ---');

  // ROUND 1: Valid Import
  console.log('\n[ROUND 1] Importing test-corpus.json (1st time)...');
  const raw1 = JSON.parse(fs.readFileSync('./test-corpus.json', 'utf8'));
  const res1 = await CorpusImporter.importFromJson(userId, tenantId, 'test-corpus.json', raw1);
  console.log(`Status: ${res1.status} | Valid: ${res1.validRows} | Duplicate: ${res1.duplicateRows} | Invalid: ${res1.invalidRows}`);

  // ROUND 2: Duplicate Detection
  console.log('\n[ROUND 2] Importing test-corpus.json again (Deduplication Check)...');
  const res2 = await CorpusImporter.importFromJson(userId, tenantId, 'test-corpus.json', raw1);
  console.log(`Status: ${res2.status} | Valid: ${res2.validRows} | Duplicate: ${res2.duplicateRows} | Invalid: ${res2.invalidRows}`);

  // ROUND 3: Schema Validation
  console.log('\n[ROUND 3] Importing invalid-corpus.json (Zod Check)...');
  const raw3 = JSON.parse(fs.readFileSync('./invalid-corpus.json', 'utf8'));
  const res3 = await CorpusImporter.importFromJson(userId, tenantId, 'invalid-corpus.json', raw3);
  console.log(`Status: ${res3.status} | Valid: ${res3.validRows} | Duplicate: ${res3.duplicateRows} | Invalid: ${res3.invalidRows}`);

  const total = await Question.countDocuments();
  console.log(`\nFinal Question Count: ${total}`);
  
  if (total === 1 && res2.duplicateRows === 1 && res3.invalidRows === 1) {
    console.log('\n✅ ALL SYSTEMS CERTIFIED: Validation, Deduplication, and Persistence are STABLE.');
  } else {
    console.log('\n❌ SYSTEM FAILURE: Discrepancies detected in the ingestion logic.');
  }

  process.exit(0);
}

fireTest().catch(console.error);
