/**
 * @purpose Renderiza la página principal del aplicativo ABDQuiz, incluyendo un encabezado heroico, botón de inicio de sesión y características de sistema.
 * @purpose_en Renders the home page of the ABDQuiz application, including a hero header, login button, and system capabilities features.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:6,sig:1d7jahn
 * @lastUpdated 2026-06-30T10:58:32.799Z
 */

import { getTranslations } from 'next-intl/server';
import { BrainCircuit, Timer, FileCode2 } from 'lucide-react';
import { HeroHeader, LandingPageLayout, SubtleLoginButton } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { redirect } from 'next/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getIndustrialSession();

  if (session.authenticated && session.user) {
    redirect(`/${locale}/examinar`);
  }

  const t = await getTranslations('common');
  const h = await getTranslations('home');

  return (
    <LandingPageLayout>
      <HeroHeader
        statusText={h('status')}
        title={<>{'ABD'}<span className="text-primary">{'Quiz'}</span></>}
        description={h('tagline')}
      />

      <main className="flex flex-col gap-16">
        <SubtleLoginButton
          href={`/${locale}/examinar`}
          label={h('accessSimulator')}
          hint={locale === 'es'
            ? 'Inicie sesión con sus credenciales federadas de ABDAuth'
            : 'Sign in utilizing your federated credentials from ABDAuth'}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="System Capabilities">
          <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
            <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
              <Timer className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              {h('feature1Title')}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h('feature1Desc')}
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
            <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
              <BrainCircuit className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              {h('feature2Title')}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h('feature2Desc')}
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
            <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
              <FileCode2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              {h('feature3Title')}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h('feature3Desc')}
            </p>
          </div>
        </div>
      </main>

      <GlobalFooter
        separatorWidth="short"
        telemetryItems={[
          { label: h('coreLabel'), value: h('version') },
          { label: h('logicLabel'), value: h('engine') },
          { label: h('styleLabel'), value: h('style') },
        ]}
      />
    </LandingPageLayout>
  );
}
