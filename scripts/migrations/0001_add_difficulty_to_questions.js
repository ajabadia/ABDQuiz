export async function up(db) {
  const collection = db.collection('questions');

  await collection.updateMany(
    { difficulty: { $exists: false } },
    { $set: { difficulty: 'medio' } }
  );

  await collection.createIndex({ difficulty: 1 });

  console.log('    -> Migración 0001 aplicada correctamente.');
}
