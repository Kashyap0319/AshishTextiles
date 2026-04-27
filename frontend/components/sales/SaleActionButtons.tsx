import React from "react";
import { Check, FilePenLine, X } from "lucide-react";

interface SaleActionButtonsProps {
  onConfirm: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
}

export function SaleActionButtons({
  onConfirm,
  onSaveDraft,
  onCancel,
}: SaleActionButtonsProps) {
  return (
    <article className="rounded-panel border border-zinc-200 bg-white p-6 shadow-soft xl:col-span-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
        Actions
      </p>
      <div className="mt-6 grid gap-3">
        <button
          onClick={onConfirm}
          className="group flex min-h-[68px] items-center justify-between rounded-[1.5rem] border border-zinc-950 bg-zinc-950 px-5 text-left text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="text-base font-semibold">Confirm Sale</span>
          <Check className="text-2xl transition group-hover:scale-105 w-6 h-6" />
        </button>
        <button
          onClick={onSaveDraft}
          className="group flex min-h-[68px] items-center justify-between rounded-[1.5rem] border border-zinc-200 bg-white px-5 text-left text-zinc-950 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-soft"
        >
          <span className="text-base font-semibold">Save Draft</span>
          <FilePenLine className="text-2xl text-zinc-500 transition group-hover:scale-105 w-6 h-6" />
        </button>
        <button
          onClick={onCancel}
          className="group flex min-h-[68px] items-center justify-between rounded-[1.5rem] border border-zinc-200 bg-white px-5 text-left text-zinc-500 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-soft"
        >
          <span className="text-base font-semibold">Cancel</span>
          <X className="text-2xl text-zinc-400 transition group-hover:scale-105 w-6 h-6" />
        </button>
      </div>
    </article>
  );
}
