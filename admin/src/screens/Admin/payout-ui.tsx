"use client";

/** Pieces shared by the three payout lists (care funds, doctors, pharmacies). */

export type PayoutStatus = "pending" | "processing" | "paid" | "failed" | "rejected";

export const PAYOUT_FILTERS = ["pending", "processing", "paid", "failed", "rejected", "all"] as const;
export type PayoutFilter = (typeof PAYOUT_FILTERS)[number];

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: "amber" | "violet" | "brand" | "rose" | "neutral" }> = {
  pending: { label: "Waiting", tone: "amber" },
  processing: { label: "Sending", tone: "violet" },
  paid: { label: "Paid", tone: "brand" },
  failed: { label: "Failed", tone: "rose" },
  rejected: { label: "Rejected", tone: "neutral" },
};

/** The status filter row. */
export function PayoutFilters({ value, onChange }: { value: PayoutFilter; onChange: (f: PayoutFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 shrink-0">
      {PAYOUT_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1.5 rounded-xl text-[13px] font-bold ${
            value === f ? "btn-ink" : "bg-white border border-line text-ink-2 hover:border-ink-3/40"
          }`}
        >
          {f === "all" ? "All" : PAYOUT_STATUS[f].label}
        </button>
      ))}
    </div>
  );
}
