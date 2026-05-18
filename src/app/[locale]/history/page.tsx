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
