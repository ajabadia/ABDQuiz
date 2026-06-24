/**
 * @purpose Renderiza un modulo de control estándar de tech-noir para el panel de administración.
 * @purpose_en Renders a standardized tech-noir control module card for the admin dashboard.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:114udti
 * @lastUpdated 2026-06-23T23:21:22.862Z
 */

import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardCardProps {
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  badgeLabel: string;
  badgeValue: string;
  actionUrl: string;
  actionText: string;
  colSpan?: string;
}

/**
 * 🎛️ DashboardCard: Standardized tech-noir control module card
 */
export function DashboardCard({
  icon: Icon,
  category,
  title,
  description,
  badgeLabel,
  badgeValue,
  actionUrl,
  actionText,
  colSpan = 'col-span-1',
}: DashboardCardProps) {
  return (
    <Card className={`p-8 bg-card/30 border-border rounded-none flex flex-col justify-between min-h-[320px] transition-all hover:border-primary/20 hover:bg-card/40 group ${colSpan}`}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="p-3 bg-white/[0.02] border border-border group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
            <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground bg-white/5 px-2.5 py-1">
            {category}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold uppercase tracking-tight italic text-foreground group-hover:text-primary transition-colors">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Separator className="bg-border" />
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          <span>{badgeLabel}</span>
          <span className="text-primary font-bold">{badgeValue}</span>
        </div>
        <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 w-full mt-2" asChild>
          <Link href={actionUrl}>
            {actionText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
