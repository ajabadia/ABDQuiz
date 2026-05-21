import { NextResponse } from 'next/server';
import { ensureIndustrialAccess } from '@/lib/session';
import connectDB from '@/lib/database/mongodb';
import Question from '@/models/Question';
import ExamConfig from '@/models/ExamConfig';

export const revalidate = 0; // Evitar el cacheado estático de la API

export async function GET() {
  try {
    // 🛡️ Verificar acceso con rol mínimo ADMIN
    const user = await ensureIndustrialAccess('ADMIN');
    
    // Solo SUPER_ADMIN puede ver todos los tenants
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    
    // Obtener los tenants con registros en Questions y ExamConfigs
    const [questionTenants, examTenants] = await Promise.all([
      Question.distinct('tenantId'),
      ExamConfig.distinct('tenantId')
    ]);

    // Unir y dedupificar
    const uniqueTenants = Array.from(new Set([...questionTenants, ...examTenants])).filter(Boolean);

    const tenants = uniqueTenants.map((id) => ({
      tenantId: id,
      name: id === 'SYSTEM' ? 'Sistema Global' : `Org: ${id}`,
      active: true,
    }));

    return NextResponse.json(tenants);
  } catch (error: unknown) {
    console.error('[API_GET_TENANTS_ERROR]', error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
