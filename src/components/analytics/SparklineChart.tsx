'use client';

/**
 * @purpose Renderiza un gráfico de línea de encendido basado en los datos proporcionados, incluyendo título y valores porcentuales.
 * @purpose_en Renders a sparkline chart based on provided data, including title and percentage values.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:ikeval
 * @lastUpdated 2026-06-23T19:49:00.315Z
 */

import React from 'react';

interface SparklineChartProps {
  data: { startedAt: string; percentage: number; mode: string }[];
  title: string;
}

export default function SparklineChart({ data, title }: SparklineChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center border border-white/5 bg-card/20 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
        FALTA FLUJO DE DATOS TEMPORALES PARA GENERAR GRÁFICA VECTORIAL
      </div>
    );
  }

  const width = 500;
  const height = 120;
  const paddingX = 30;
  const paddingY = 20;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    const y = paddingY + (1 - d.percentage / 100) * (height - 2 * paddingY);
    return { x, y, percentage: d.percentage, label: d.startedAt };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold font-mono">{title}</div>
      <div className="relative border border-white/5 bg-card/20 p-4 rounded-none select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="currentColor" className="text-white/5" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="currentColor" className="text-white/5" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" className="text-white/5" strokeWidth="0.5" strokeDasharray="2 2" />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#sparkline-gradient)" />

          {/* Stroke Line */}
          <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="3" fill="var(--background)" stroke="var(--primary)" strokeWidth="1.5" className="transition-all duration-200 hover:r-4 hover:fill-primary" />
              {/* Tooltip on hover */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 30} y={p.y - 25} width="60" height="18" fill="var(--background)" stroke="var(--primary)" strokeWidth="1" strokeOpacity="0.2" rx="0" />
                <text x={p.x} y={p.y - 13} fill="var(--primary)" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {p.percentage}%
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
