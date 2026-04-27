import React from "react";

interface BuyerInfoProps {
  name: string;
  isVerified: boolean;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  dispatchMode: string;
  gstin: string;
}

export function BuyerInfoCard({
  name,
  isVerified,
  contactName,
  phone,
  email,
  address,
  dispatchMode,
  gstin,
}: BuyerInfoProps) {
  return (
    <article className="rounded-panel border border-zinc-200 bg-pearl p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
            Buyer Information
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.055em] text-zinc-950">
            {name}
          </h2>
        </div>
        {isVerified && (
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
            Verified
          </span>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Contact
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">
            {contactName}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {phone} &middot; {email}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Delivery
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">{address}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Dispatch by {dispatchMode} &middot; GSTIN {gstin}
          </p>
        </div>
      </div>
    </article>
  );
}
