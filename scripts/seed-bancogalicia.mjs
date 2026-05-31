/**
 * Seed script for tenant 'bancogalicia'
 *
 * Creates:
 *   1. Tenant registration in ABDElevators-Auth.tenants
 *   2. Spaces (TENANT + TEAM types)
 *   3. Permission groups
 *
 * Usage: node scripts/seed-bancogalicia.mjs
 */
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.join('=').trim();
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const AUTH_DB = process.env.MONGODB_AUTH_DB || 'ABDElevators-Auth';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// ── Tenant data ──
const TENANT_ID = 'bancogalicia';
const DB_PREFIX = 'bancogalicia';

const SPACES = [
  {
    name: 'Espacio General',
    slug: 'espacio-general',
    description: 'Espacio principal del banco',
    type: 'TENANT',
    visibility: 'PUBLIC',
  },
  {
    name: 'Personal: María López',
    slug: 'personal-maria-lopez',
    description: 'Espacio personal de María López',
    type: 'PERSONAL',
    visibility: 'PRIVATE',
  },
  {
    name: 'Sucursal Centro',
    slug: 'sucursal-centro',
    description: 'Equipo de la sucursal céntrica',
    type: 'TEAM',
    visibility: 'INTERNAL',
  },
  {
    name: 'Sucursal Norte',
    slug: 'sucursal-norte',
    description: 'Equipo de la sucursal norte',
    type: 'TEAM',
    visibility: 'INTERNAL',
  },
];

const GROUPS = [
  {
    name: 'Administradores',
    slug: 'administradores',
    description: 'Grupo con permisos administrativos totales',
    allowedApps: ['abdquiz', 'abdlogs', 'abdtenantgobernance'],
  },
  {
    name: 'Supervisores',
    slug: 'supervisores',
    description: 'Supervisores de sucursal',
    allowedApps: ['abdquiz'],
  },
  {
    name: 'Gestores de Contenido',
    slug: 'gestores-contenido',
    description: 'Gestores de contenido educativo',
    allowedApps: ['abdquiz'],
  },
  {
    name: 'Auditores',
    slug: 'auditores',
    description: 'Auditores internos con acceso de solo lectura',
    allowedApps: ['abdlogs'],
  },
];

async function seed() {
  try {
    console.log(`🚀 Seeding tenant: ${TENANT_ID}`);
    await mongoose.connect(MONGODB_URI);
    const conn = mongoose.connection;
    console.log('📡 Connected to MongoDB');

    // ── 1. Register tenant in central auth database ──
    const authDb = conn.useDb(AUTH_DB, { useCache: true });
    const tenantsCol = authDb.collection('tenants');

    const existingTenant = await tenantsCol.findOne({ tenantId: TENANT_ID });
    if (existingTenant) {
      console.log(`  ℹ️  Tenant '${TENANT_ID}' already registered, updating...`);
      await tenantsCol.updateOne(
        { tenantId: TENANT_ID },
        { $set: { active: true, updatedAt: new Date() } }
      );
    } else {
      await tenantsCol.insertOne({
        tenantId: TENANT_ID,
        dbPrefix: DB_PREFIX,
        isolationStrategy: 'COLLECTION_PREFIX',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Banco Galicia',
        allowedApps: ['abdquiz', 'abdlogs', 'abdtenantgobernance', 'abdauth'],
      });
      console.log(`  ✅ Tenant '${TENANT_ID}' registered in ${AUTH_DB}.tenants`);
    }

    // ── 2. Create Spaces ──
    const spaceCol = conn.collection(`${DB_PREFIX}_Space`);
    for (const space of SPACES) {
      const existing = await spaceCol.findOne({ slug: space.slug });
      if (existing) {
        console.log(`  ℹ️  Space '${space.slug}' already exists, skipping`);
      } else {
        await spaceCol.insertOne({
          ...space,
          tenantId: TENANT_ID,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✅ Space created: ${space.name} (${space.slug})`);
      }
    }

    // ── 3. Create Permission Groups ──
    const groupCol = conn.collection(`${DB_PREFIX}_PermissionGroup`);
    for (const group of GROUPS) {
      const existing = await groupCol.findOne({ slug: group.slug });
      if (existing) {
        console.log(`  ℹ️  Group '${group.slug}' already exists, skipping`);
      } else {
        await groupCol.insertOne({
          ...group,
          tenantId: TENANT_ID,
          policyIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✅ Group created: ${group.name} (${group.slug})`);
      }
    }

    console.log(`\n✅ Seed completed for tenant '${TENANT_ID}'`);
    console.log(`   - ${SPACES.length} spaces`);
    console.log(`   - ${GROUPS.length} groups`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
