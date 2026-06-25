export async function up(db) {
  const collection = db.collection('courses');

  await collection.updateMany(
    { professors: { $exists: false } },
    { $set: { professors: [] } }
  );

  await collection.createIndex({ professors: 1 });

  console.log('    -> Migración 0002 aplicada correctamente.');
}
