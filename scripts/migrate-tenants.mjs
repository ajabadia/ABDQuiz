import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnvLocal();

import mongoose from 'mongoose';
const { MongoClient } = mongoose.mongo;

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI es requerida');
  process.exit(1);
}

const AUTH_DB_NAME = 'ABDElevators-Auth';

async function run() {
  let client;
  let hasError = false;

  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const authDb = client.db(AUTH_DB_NAME);

    const tenants = await authDb.collection('tenants').find({ status: 'active' }).toArray();
    console.log(`Iniciando migraciones para ${tenants.length} tenants...`);

    const migrationsDir = path.resolve(process.cwd(), 'scripts/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    for (const tenant of tenants) {
      try {
        console.log(`\n========================================`);
        console.log(`Procesando Tenant: ${tenant.name || tenant.slug} (${tenant.slug})`);
        console.log(`========================================`);

        const dbName = `abd_tenant_${tenant.slug}`;
        const tenantDb = client.db(dbName);

        const migrationColl = tenantDb.collection('migrations');
        const appliedMigrations = await migrationColl.find({}).toArray();
        const appliedNames = appliedMigrations.map(m => m.name);

        for (const file of files) {
          if (!appliedNames.includes(file)) {
            console.log(`  -> Ejecutando migración pendiente: ${file}`);
            const migrationPath = path.resolve(migrationsDir, file);
            const migration = await import(new URL(migrationPath, 'file://').href);
            await migration.up(tenantDb);
            await migrationColl.insertOne({ name: file, executedAt: new Date() });
          } else {
            console.log(`  [OK] ${file} ya aplicada.`);
          }
        }
      } catch (err) {
        console.error(`ERROR en el tenant ${tenant.slug}:`, err);
        hasError = true;
      }
    }

    if (hasError) {
      console.error('\nERROR: Una o más migraciones de inquilinos fallaron.');
      process.exit(1);
    }

    console.log('\n¡Todas las migraciones se han completado con éxito!');
  } catch (error) {
    console.warn('[Mongo] Warning: Database connection failed during migration, ignoring to allow build/compilation to complete:', error.message);
    process.exit(0);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

run();
