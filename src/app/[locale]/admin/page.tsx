import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { Separator } from '@/components/ui/separator';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { resolveTenantContext } from '@/lib/tenant-context';
import { 
  Database, 
  Sliders, 
  Settings, 
  ShieldCheck, 
  LayoutDashboard,
  Terminal,
  CalendarRange,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { DashboardCard } from '@/components/admin/DashboardCard';
import { AdminPageHeader } from '@ajabadia/styles';

/**
 * 🛰️ Central Admin Governance Portal Page (Federated Server Component)
 */
export default async function AdminPortalPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const c = await getTranslations('common');
  const ap = await getTranslations('adminPortal');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureAdminOrProfessor();
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';
  const governanceUrl = process.env.NEXT_PUBLIC_GOVERNANCE_URL || 'https://abd-tenant-gobernance.vercel.app';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header: Variante A */}
        <AdminPageHeader
          icon={LayoutDashboard}
          breadcrumb={<>{c('appTitle')} • DASHBOARD</>}
          title={<>{c('appTitle')} <span className="text-primary">{ap('gobernanza')}</span></>}
          description={<>{ap('subTitle')}<span className="text-primary font-bold">{resolvedTenantId}</span></>}
        />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls Column (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Card 1: Question Ingestor */}
              <DashboardCard
                icon={Database}
                category={ap('bancoDatos')}
                title={t('title')}
                description={`${t('subtitle')} ${ap('ingestorDesc')}`}
                badgeLabel={ap('deduplicacion')}
                badgeValue={ap('activo')}
                actionUrl={`/${locale}/admin/corpus${tenantSuffix}`}
                actionText={ap('ingresarIngestador')}
              />

              {/* Card 2: Exam Parametrization */}
              <DashboardCard
                icon={Sliders}
                category={ap('algoritmos')}
                title={t('examsTitle')}
                description={`${t('examsSubtitle')} ${ap('examsDesc')}`}
                badgeLabel={ap('evaluacionPond')}
                badgeValue={ap('soportado')}
                actionUrl={`/${locale}/admin/exams${tenantSuffix}`}
                actionText={ap('ingresarParametrizar')}
              />

              {/* Card 3: Question Repository */}
              <DashboardCard
                icon={Settings}
                category={ap('repositorio')}
                title={ap('questionsTitle')}
                description={ap('questionsDesc')}
                badgeLabel={ap('trazabilidad')}
                badgeValue={ap('activo')}
                actionUrl={`/${locale}/admin/questions${tenantSuffix}`}
                actionText={ap('ingresarRepo')}
              />

              {/* Card 4: Technical Claims & Allegations */}
              <DashboardCard
                icon={Settings}
                category="Arbitraje"
                title="Impugnaciones"
                description="Gestión de reclamaciones técnicas de alumnos, anulación de preguntas y motor de recálculo retroactivo."
                badgeLabel="Recálculo"
                badgeValue="Activo"
                actionUrl={`/${locale}/admin/allegations${tenantSuffix}`}
                actionText="Gestionar Impugnaciones"
              />

              {/* Card 5: Courses */}
              <DashboardCard
                icon={BookOpen}
                category={ap('repositorio')}
                title={t('coursesTitle')}
                description={t('coursesSubtitle')}
                badgeLabel="Learning Paths"
                badgeValue={ap('activo')}
                actionUrl={`/${locale}/admin/courses${tenantSuffix}`}
                actionText="Gestionar Cursos"
              />

              {/* Card 6: Exam Assignments */}
              <DashboardCard
                icon={CalendarRange}
                category="Calendarización"
                title="Asignaciones"
                description="Creación y gestión de convocatorias de examen con ventanas temporales exactas, control de acceso y publicación."
                badgeLabel="Timeframes"
                badgeValue="Activo"
                actionUrl={`/${locale}/admin/assignments${tenantSuffix}`}
                actionText="Gestionar Asignaciones"
              />

              {/* Card 6: Exam Attempt Resets */}
              <DashboardCard
                icon={Sliders}
                category="Gobernanza"
                title="Control de Intentos"
                description="Auditoría e invalidación lógica de intentos de simulacros. Concede reintentos extraordinarios de forma instantánea y segura."
                badgeLabel="Reintentos Extraordinarios"
                badgeValue="Soportado"
                actionUrl={`/${locale}/admin/attempts${tenantSuffix}`}
                actionText="Gestionar Intentos y Reintentos"
                colSpan="col-span-1 md:col-span-2"
              />

              {/* Card 7: Manual Grading (Feature Flagged) */}
              {process.env.NEXT_PUBLIC_ENABLE_OPEN_TEXT_QUESTIONS === 'true' && (
                <DashboardCard
                  icon={GraduationCap}
                  category={ap('algoritmos')}
                  title={ap('gradingTitle')}
                  description={ap('gradingDesc')}
                  badgeLabel={ap('gradingBadgeLabel')}
                  badgeValue={ap('gradingBadgeValue')}
                  actionUrl={`/${locale}/admin/grading${tenantSuffix}`}
                  actionText={ap('gradingActionText')}
                />
              )}
            </div>
          </div>

          {/* System Telemetry Sidebar (1/3 width) */}
          <Card className="p-8 bg-card/10 border-border rounded-none flex flex-col gap-6 h-fit">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">{ap('seguridadNucleo')}</h2>
            </div>
            
            <Separator className="bg-border" aria-hidden="true" />

            <div className="flex flex-col gap-4 font-mono text-[10px] uppercase">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground tracking-wider">{ap('autoridad')}</span>
                <span className="text-foreground font-bold">{t('superuser')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border">
                <span className="text-muted-foreground tracking-wider">{ap('protocolo')}</span>
                <span className="text-foreground font-bold">{t('protocol')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border">
                <span className="text-muted-foreground tracking-wider">{ap('modoRegional')}</span>
                <span className="text-foreground font-bold">{locale.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border">
                <span className="text-foreground tracking-wider font-bold">{ap('estadoAuditoria')}</span>
                <span className="text-primary font-black animate-pulse">{ap('certificadoOk')}</span>
              </div>
            </div>

            <Separator className="bg-border" aria-hidden="true" />
            
            <div className="p-4 bg-white/[0.02] border border-border flex flex-col gap-3 rounded-none">
              <div className="flex items-center gap-2 text-[9px] font-mono font-bold tracking-widest text-primary uppercase">
                <Terminal className="w-3.5 h-3.5" />
                {ap('conexionCentral')}
              </div>
              <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-mono">
                {ap('conexionCentralDesc')}
              </p>
              <a 
                href={governanceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2 px-3 bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-[9px] font-mono font-bold uppercase tracking-widest text-primary transition-all duration-200"
              >
                {ap('gobernanzaPortalBtn')}
              </a>
            </div>
          </Card>

        </div>

        {/* Footer */}
        <GlobalFooter label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`} opacity={20} />

      </div>
    </main>
  );
}
