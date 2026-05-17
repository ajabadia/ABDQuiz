import mongoose from 'mongoose';
import connectDB from './web/src/lib/database/mongodb.js';
import Question from './web/src/models/Question.js';
import CorpusImport from './web/src/models/CorpusImport.js';
import CorpusImportRow from './web/src/models/CorpusImportRow.js';

async function audit() {
  await connectDB();
  console.log('--- DB AUDIT START ---');
  
  const totalQuestions = await Question.countDocuments();
  console.log(`Total Questions: ${totalQuestions}`);
  
  const lastImports = await CorpusImport.find().sort({ createdAt: -1 }).limit(5);
  console.log('\n--- LAST IMPORTS ---');
  lastImports.forEach(imp => {
    console.log(`ID: ${imp._id} | Name: ${imp.sourceName} | Status: ${imp.status} | VLD: ${imp.validRows} | DUP: ${imp.duplicateRows} | ERR: ${imp.invalidRows} | Created: ${imp.createdAt}`);
  });

  const testImport = await CorpusImport.findOne({ sourceName: 'test-corpus.json' });
  if (testImport) {
    console.log('\n--- TEST-CORPUS.JSON ROWS ---');
    const rows = await CorpusImportRow.find({ corpusImportId: testImport._id });
    rows.forEach(r => {
      console.log(`Row: ${r.rowNumber} | Status: ${r.status} | Hash: ${r.questionHash}`);
    });
  } else {
    console.log('\nNo import found for test-corpus.json');
  }

  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
