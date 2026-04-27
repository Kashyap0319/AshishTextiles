import React from "react";
import { ShieldCheck } from "lucide-react";

interface PricingSummaryProps {
  totalAmount: number;
  marginPercent: number;
  balesCount: number;
  totalWeight: number;
  materialValue: number;
  transportEstimate: number;
  marginStatus: "Above floor" | "Below floor" | "Pending";
  marginMessage: string;
}

export function PricingSummaryCard({
  totalAmount,
  marginPercent,
  balesCount,
  totalWeight,
  materialValue,
  transportEstimate,
  marginStatus,
  marginMessage,
}: PricingSummaryProps) {
  return (
    <article className="rounded-panel border border-zinc-300 bg-white p-6 shadow-soft ring-1 ring-zinc-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
            Pricing Summary
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.055em] text-zinc-950">
            &#8377;{totalAmount.toLocaleString("en-IN")}
          </h2>
        </div>
        <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white">
          {marginPercent}% Margin
        </span>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <span className="text-zinc-500">Selected bales</span>
          <span className="font-semibold text-zinc-950">{balesCount}</span>
        </div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <span className="text-zinc-500">Total weight</span>
          <span className="font-semibold text-zinc-950">{totalWeight} kg</span>
        </div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <span className="text-zinc-500">Material value</span>
          <span className="font-semibold text-zinc-950">
            &#8377;{materialValue.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <span className="text-zinc-500">Transport estimate</span>
          <span className="font-semibold text-zinc-950">
            &#8377;{transportEstimate.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold text-zinc-950">Invoice total</span>
          <span className="text-2xl font-light tracking-[-0.05em] text-zinc-950">
            &#8377;{totalAmount.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-porcelain p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-950">Margin analysis</p>
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {marginStatus}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="h-1.5 flex-[0.62] rounded-full bg-zinc-950"></span>
          <span className="h-1.5 flex-[0.24] rounded-full bg-zinc-400"></span>
          <span className="h-1.5 flex-[0.14] rounded-full bg-zinc-200"></span>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{marginMessage}</p>
      </div>

      <a
        href="#"
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition hover:bg-porcelain"
      >
        <ShieldCheck className="text-lg w-5 h-5" />
        Review pricing details
      </a>
    </article>
  );
}
