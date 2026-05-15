import connectDB from '../src/lib/database/mongodb';
import Question from '../src/models/Question';

async function identify() {
  await connectDB();
  const lastQuestion = await Question.findOne().sort({ createdAt: -1 });
  if (lastQuestion) {
    console.log('--- LAST QUESTION IDENTIFIED ---');
    console.log(`Text: ${lastQuestion.questionText}`);
    console.log(`Module: ${lastQuestion.module}`);
    console.log(`Hash: ${lastQuestion.contentHash}`);
    console.log(`Created At: ${lastQuestion.createdAt}`);
  } else {
    console.log('No questions found.');
  }
  process.exit(0);
}

identify().catch(console.error);
