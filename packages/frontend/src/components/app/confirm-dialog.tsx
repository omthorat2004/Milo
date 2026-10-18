"use client";

import { useEffect, useId } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-card border border-surface-border bg-background p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-lg text-foreground">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-foreground-muted">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className="bg-clay-400 text-ink-950 shadow-none hover:bg-clay-400/90 active:bg-clay-400"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
