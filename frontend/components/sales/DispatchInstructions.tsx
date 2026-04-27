import React from "react";

interface DispatchInstructionsProps {
  value: string;
  onChange: (val: string) => void;
  qcStatus?: string;
}

export function DispatchInstructions({ value, onChange, qcStatus }: DispatchInstructionsProps) {
  return (
    <article className="rounded-panel border border-zinc-200 bg-pearl p-6 shadow-soft xl:col-span-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
            Sale Notes
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.055em] text-zinc-950">
            Dispatch instructions
          </h2>
        </div>
        {qcStatus && (
          <span className="w-max rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500">
            {qcStatus}
          </span>
        )}
      </div>
      <textarea
        aria-label="Dispatch instructions"
        className="mt-6 min-h-[132px] w-full resize-none rounded-[1.5rem] border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
        placeholder="Add transport note, packaging instruction, payment term, or dispatch exception..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </article>
  );
}
