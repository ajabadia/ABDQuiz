"use client"

/**
 * @purpose Renderiza un componente de barra de progreso utilizando Radix UI.
 * @purpose_en Renders a progress bar component using Radix UI.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:0,imports:3,sig:yj2i37
 * @lastUpdated 2026-06-23T19:50:31.214Z
 */

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        data-progress-value={value || 0}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
