"use client";

import React, { useState } from "react";
import { BuyerInfoCard } from "@/components/sales/BuyerInfoCard";
import { PricingSummaryCard } from "@/components/sales/PricingSummaryCard";
import { DispatchInstructions } from "@/components/sales/DispatchInstructions";
import { SaleActionButtons } from "@/components/sales/SaleActionButtons";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SalesInvoicePage() {
  const [dispatchNote, setDispatchNote] = useState(
    "Hold CS-7802 until quality mix verification is completed. Dispatch remaining bales after owner confirms final rate."
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-foreground">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 xl:py-12">
        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <Link
              href="/dashboard"
              className="group mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
            >
              <ArrowLeft className="text-base transition group-hover:-translate-x-1" />
              Back to dashboard
            </Link>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <h1 className="text-4xl font-light tracking-[-0.055em] text-zinc-950 sm:text-5xl md:text-[56px] leading-[1.1]">
                Sales Invoice
              </h1>
              <span className="w-max rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Draft Mode
              </span>
            </div>
          </div>
        </header>

        <section className="fade-in-up grid grid-cols-1 gap-4 lg:grid-cols-12 xl:gap-6">
          <div className="lg:col-span-8">
            <BuyerInfoCard
              name="Aarya Exports"
              isVerified={true}
              contactName="Rohit Mehta"
              phone="+91 98765 44210"
              email="rohit@aaryaexports.in"
              address="Surat Textile Market, Ring Road"
              dispatchMode="Tempo"
              gstin="24AAXCA9812F1Z9"
            />
          </div>
          <div className="lg:col-span-4">
            <PricingSummaryCard
              totalAmount={79592}
              marginPercent={11.8}
              balesCount={3}
              totalWeight={796}
              materialValue={77192}
              transportEstimate={2400}
              marginStatus="Above floor"
              marginMessage="Current blended margin is 2.1% above owner approval threshold."
            />
          </div>
        </section>

        <section className="fade-in-up fade-delay-2 mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <DispatchInstructions
              value={dispatchNote}
              onChange={setDispatchNote}
              qcStatus="QC hold on 1 bale"
            />
          </div>
          <div className="xl:col-span-4">
            <SaleActionButtons
              onConfirm={() => alert("Sale Confirmed!")}
              onSaveDraft={() => alert("Draft Saved!")}
              onCancel={() => alert("Cancelled")}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
