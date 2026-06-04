import mongoose from 'mongoose';

const URI = "mongodb+srv://ajabadia03_db_user:Ajabafan1974@cluster0.xarmew0.mongodb.net/ABDElevators-Auth?retryWrites=true&w=majority";

const spaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['TENANT', 'TEAM', 'PERSONAL'], default: 'TENANT' },
  tenantId: { type: String, required: true },
  ownerUserId: { type: String },
  parentSpaceId: { type: String },
  materializedPath: { type: String },
  visibility: { type: String, enum: ['PUBLIC', 'INTERNAL', 'PRIVATE'], default: 'INTERNAL' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const groupSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionGroup' },
  policyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PermissionPolicy' }],
  allowedApps: [{ type: String }],
}, { timestamps: true });

const TENANT_ID = 'banco-parque';
const DB_PREFIX = 'bancoparque';
const SPACES_COLL = `${DB_PREFIX}_spaces`;
const GROUPS_COLL = `${DB_PREFIX}_permissiongroups`;

const testSpaces = [
  {
    name: 'Sucursal Central',
    slug: 'sucursal-central',
    description: 'Oficina central del Banco Parque',
    type: 'TENANT',
    tenantId: TENANT_ID,
    ownerUserId: undefined,
    visibility: 'PUBLIC',
    isActive: true,
  },
  {
    name: 'Sucursal Norte',
    slug: 'sucursal-norte',
    description: 'Sucursal zona norte',
    type: 'TEAM',
    tenantId: TENANT_ID,
    parentSpaceId: null,
    visibility: 'INTERNAL',
    isActive: true,
  },
  {
    name: 'Sucursal Sur',
    slug: 'sucursal-sur',
    description: 'Sucursal zona sur',
    type: 'TEAM',
    tenantId: TENANT_ID,
    parentSpaceId: null,
    visibility: 'INTERNAL',
    isActive: true,
  },
  {
    name: 'Personal: Alberto',
    slug: 'personal-alberto',
    description: 'Espacio personal de Alberto Jabadía',
    type: 'PERSONAL',
    tenantId: TENANT_ID,
    visibility: 'PRIVATE',
    isActive: true,
  },
];

const testGroups = [
  {
    tenantId: TENANT_ID,
    name: 'Administradores',
    slug: 'administradores',
    description: 'Grupo de administración del sistema',
    policyIds: [],
    allowedApps: ['ABDAuth', 'ABDQuiz', 'ABDLogs', 'ABDAnalytics'],
  },
  {
    tenantId: TENANT_ID,
    name: 'Instructores',
    slug: 'instructores',
    description: 'Instructores de exámenes',
    policyIds: [],
    allowedApps: ['ABDQuiz'],
  },
  {
    tenantId: TENANT_ID,
    name: 'Auditores',
    slug: 'auditores',
    description: 'Auditores internos',
    policyIds: [],
    allowedApps: ['ABDLogs', 'ABDAnalytics'],
  },
  {
    tenantId: TENANT_ID,
    name: 'Alumnos',
    slug: 'alumnos',
    description: 'Alumnos en formación',
    policyIds: [],
    allowedApps: ['ABDQuiz'],
  },
];

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  console.log('Connected to:', db.databaseName);

  // ── Register Tenant ──────────────────────────────────────────────────────
  const tenantsCol = db.collection('tenants');
  const existingTenant = await tenantsCol.findOne({ tenantId: TENANT_ID });
  if (!existingTenant) {
    await tenantsCol.insertOne({
      tenantId: TENANT_ID,
      dbPrefix: DB_PREFIX,
      isolationStrategy: 'COLLECTION_PREFIX',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Banco Parque',
      allowedApps: ['abdquiz', 'abdlogs', 'abdtenantgobernance', 'abdauth', 'quiz', 'gobernanza', 'logs', 'analytics'],
    });
    console.log(`Registered tenant '${TENANT_ID}' in tenants collection.`);
  } else {
    console.log(`Tenant '${TENANT_ID}' already exists in tenants collection, ensuring active...`);
    await tenantsCol.updateOne(
      { tenantId: TENANT_ID },
      { $set: { active: true, updatedAt: new Date() } }
    );
  }

  // ── Spaces ──────────────────────────────────────────────────────────────
  const spacesCol = db.collection(SPACES_COLL);
  await spacesCol.deleteMany({ tenantId: TENANT_ID });
  console.log(`Cleared existing spaces for ${TENANT_ID}`);

  const spaceDocs = testSpaces.map((s, i) => ({
    ...s,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Link parentSpaceId: second space has parent = first space
  spaceDocs[1].parentSpaceId = String(spaceDocs[0]._id);
  spaceDocs[1].materializedPath = `,${String(spaceDocs[0]._id)},`;

  await spacesCol.insertMany(spaceDocs);
  console.log(`Inserted ${spaceDocs.length} spaces into '${SPACES_COLL}'`);

  // ── Groups ──────────────────────────────────────────────────────────────
  const groupsCol = db.collection(GROUPS_COLL);
  await groupsCol.deleteMany({ tenantId: TENANT_ID });
  console.log(`Cleared existing groups for ${TENANT_ID}`);

  const groupDocs = testGroups.map((g) => ({
    ...g,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await groupsCol.insertMany(groupDocs);
  console.log(`Inserted ${groupDocs.length} groups into '${GROUPS_COLL}'`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=== SEED COMPLETE ===');
  console.log(`Tenant:     ${TENANT_ID}`);
  console.log(`DbPrefix:   ${DB_PREFIX}`);
  console.log(`Spaces:     ${spaceDocs.length} documents in '${SPACES_COLL}'`);
  console.log(`Groups:     ${groupDocs.length} documents in '${GROUPS_COLL}'`);
  console.log('\nSpaces seeded:');
  spaceDocs.forEach(s => console.log(`  - ${s.name} (${s.slug}) [${s.type}, ${s.visibility}]`));
  console.log('\nGroups seeded:');
  groupDocs.forEach(g => console.log(`  - ${g.name} (${g.slug}) — apps: ${g.allowedApps.join(', ')}`));

  await mongoose.disconnect();
  console.log('\nDisconnected. ✅');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
