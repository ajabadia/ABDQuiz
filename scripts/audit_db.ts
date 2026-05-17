import connectDB from '../src/lib/database/mongodb';
import Question from '../src/models/Question';
import CorpusImport, { ICorpusImport } from '../src/models/CorpusImport';
import CorpusImportRow, { ICorpusImportRow } from '../src/models/CorpusImportRow';

async function audit() {
  await connectDB();
  console.log('--- DB AUDIT START ---');
  
  const totalQuestions = await Question.countDocuments();
  console.log(`Total Questions: ${totalQuestions}`);
  
  const lastImports = await CorpusImport.find().sort({ createdAt: -1 }).limit(5) as ICorpusImport[];
  console.log('\n--- LAST IMPORTS ---');
  lastImports.forEach((imp: ICorpusImport) => {
    console.log(`ID: ${imp._id} | Name: ${imp.sourceName} | Status: ${imp.status} | VLD: ${imp.validRows} | DUP: ${imp.duplicateRows} | ERR: ${imp.invalidRows} | Created: ${imp.createdAt}`);
  });

  const testImport = await CorpusImport.findOne({ sourceName: 'test-corpus.json' }) as ICorpusImport | null;
  if (testImport) {
    console.log('\n--- TEST-CORPUS.JSON ROWS ---');
    const rows = await CorpusImportRow.find({ corpusImportId: testImport._id }) as ICorpusImportRow[];
    rows.forEach((r: ICorpusImportRow) => {
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
