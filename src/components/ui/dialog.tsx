"use client"

/**
 * @purpose Gestiona y renderiza un componente de diálogo utilizando primitivas de UI Radix.
 * @purpose_en Manages and renders a dialog component using Radix UI primitives.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:0,imports:5,sig:dbpzve
 * @lastUpdated 2026-06-23T19:50:23.113Z
 */

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { DialogPortal, DialogOverlay } from "./dialog-primitives"
import { DialogContent } from "./dialog-content"
import { DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@ajabadia/ecosystem-widgets"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
