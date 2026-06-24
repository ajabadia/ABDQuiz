/**
 * @purpose Renderiza un componente AnalyticsDashboard dentro de un contenedor principal.
 * @purpose_en Renders an AnalyticsDashboard component within a main container.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:8k7a2o
 * @lastUpdated 2026-06-23T16:50:04.123Z
 */

import React from 'react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default async function HistoryPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <AnalyticsDashboard />
      </div>
    </main>
  );
}
