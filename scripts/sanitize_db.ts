import connectDB from '../src/lib/database/mongodb';
import Question from '../src/models/Question';

async function sanitize() {
  await connectDB();
  console.log('--- SANITIZING DB ---');
  
  const result = await Question.deleteMany({ 
    $or: [
      { contentHash: { $exists: false } },
      { contentHash: null },
      { contentHash: "undefined" }
    ]
  });
  
  console.log(`Deleted ${result.deletedCount} inconsistent questions.`);
  process.exit(0);
}

sanitize().catch(console.error);
