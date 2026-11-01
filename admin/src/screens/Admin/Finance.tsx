"use client";

import {
  RiAlertLine,
  RiArrowRightLine,
  RiCoinsLine,
  RiHandCoinLine,
  RiLineChartLine,
  RiRefund2Line,
  RiSafe2Line,
  RiStethoscopeLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

type Point = { at: string; appointmentsCents: number; coinsCents: number };

type FinanceData = {
  days: number;
  bucket: "day" | "week" | "month";
  currency: string;
  summary: {
    cashInCents: number;
    appointmentFeesCents: number;
    paidVisits: number;
    byMethod: { cardCents: number; walletCents: number; olderCents: number };
    coinSalesCents: number;
    coinsSold: number;
    giftCoins: number;
    giftFeeCents: number;
    giftToFundsCents: number;
    refundedCents: number;
    refundCount: number;
    payoutsPaidCents: number;
    payoutsPaidCount: number;
  };
  owed: {
    unspentCoins: number;
    careFundsCents: number;
    careFundCount: number;
    payoutsHeldCents: number;
    payoutsHeldCount: number;
    totalCents: number;
  };
  doctors: {
    docId: string;
    name: string;
    speciality?: string;
    visits: number;
    grossCents: number;
    refundCents: number;
    netCents: number;
    noShows: number;
    missedByDoctor: number;
  }[];
  attention: {
    pendingPayouts: number;
    refunds: { appointmentId: string; patient: string; doctor: string; slotDate: string; cents: number; why: string }[];
  };
  trend: Point[];
};

const PERIODS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
  { days: 0, label: "All time" },
] as const;

// chart series colours (checked for colour-blind separation and contrast on white)
const SERIES = {
  appointmentsCents: { label: "Appointment fees (card)", color: "#0d9488" },
  coinsCents: { label: "Coin sales", color: "#d97706" },
} as const;

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const shortMoney = (cents: number) =>
  cents >= 100_000 ? `$${(cents / 100_000).toFixed(cents >= 1_000_000 ? 0 : 1)}k` : `$${Math.round(cents / 100)}`;

/** "2026-11-01" → "1 Nov" (day/week) or "Nov 2026" (month) */
const bucketLabel = (at: string, bucket: FinanceData["bucket"]) => {
  const d = new Date(`${at}T00:00:00Z`);
  return bucket === "month"
    ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

/** The clinic's money: what came in, what it keeps, what it owes, who earned what. */
export default function Finance() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<FinanceData | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ADMIN.FINANCE, { params: { days } });
      if (data.success) setData(data);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load finance");
    }
  }, [days]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const periodName = PERIODS.find((p) => p.days === days)?.label.toLowerCase() ?? "";

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiLineChartLine size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Clinic <span className="text-teal-500 font-serif italic">finance</span>
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">What came in, what the clinic keeps, and what it still owes.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                  days === p.days ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {data === null ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-[24px] bg-slate-200/60 animate-pulse" />
              ))}
            </div>
            <div className="h-72 rounded-[28px] bg-slate-200/60 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            <Attention data={data} />

            {/* headline numbers for the period */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat
                icon={<RiHandCoinLine size={18} />}
                label="Cash in"
                value={money(data.summary.cashInCents)}
                hint="Card payments for visits + coin sales, through Stripe"
              />
              <Stat
                icon={<RiStethoscopeLine size={18} />}
                label="Appointment fees"
                value={money(data.summary.appointmentFeesCents)}
                hint={`${data.summary.paidVisits} paid visit${data.summary.paidVisits === 1 ? "" : "s"}, any payment method`}
              />
              <Stat
                icon={<RiCoinsLine size={18} />}
                label="Clinic's gift fees"
                value={money(data.summary.giftFeeCents)}
                hint={`From ${data.summary.giftCoins.toLocaleString()} coins of gifts; ${money(data.summary.giftToFundsCents)} went to care funds`}
              />
              <Stat
                icon={<RiRefund2Line size={18} />}
                label="Refunds sent"
                value={money(data.summary.refundedCents)}
                hint={`${data.summary.refundCount} refund${data.summary.refundCount === 1 ? "" : "s"} (cancelled or missed visits)`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
                <TrendChart data={data} />
              </section>
              <Owed data={data} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <PaymentSplit data={data} />
              <section className="lg:col-span-2 bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
                <h2 className="font-black text-slate-900">Doctor earnings</h2>
                <p className="text-[12px] text-slate-400 mt-0.5 mb-4">
                  Paid visits in the last {periodName}, minus refunds. Cancelled visits are left out.
                </p>
                <DoctorTable doctors={data.doctors} />
              </section>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Visits paid from the wallet used coins or care fund money that was already counted when the coins were
              bought, so &quot;Cash in&quot; leaves them out. Totals are in {data.currency}; 1 coin = 1 cent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{hint}</p>
    </div>
  );
}

/** Things that need someone to act: payouts waiting, refunds that didn't go through. */
function Attention({ data }: { data: FinanceData }) {
  const { pendingPayouts, refunds } = data.attention;
  if (!pendingPayouts && !refunds.length) return null;
  return (
    <section className="rounded-[28px] border border-orange-200 bg-orange-50/60 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-orange-800">
        <RiAlertLine size={18} />
        <h2 className="font-black">Needs attention</h2>
      </div>
      {pendingPayouts > 0 && (
        <Link
          to="/payouts"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white border border-orange-100 px-4 py-3 text-sm font-bold text-slate-800 hover:border-orange-300"
        >
          <span>
            {pendingPayouts} care fund withdrawal{pendingPayouts === 1 ? "" : "s"} waiting for approval
          </span>
          <RiArrowRightLine size={16} className="text-orange-600 shrink-0" />
        </Link>
      )}
      {refunds.length > 0 && (
        <ul className="mt-3 space-y-2">
          {refunds.map((r) => (
            <li
              key={r.appointmentId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-2xl bg-white border border-orange-100 px-4 py-3 text-sm"
            >
              <span className="text-slate-800">
                <span className="font-bold">{money(r.cents)}</span> to {r.patient}{" "}
                <span className="text-slate-400">
                  · {r.doctor} · {r.slotDate.replaceAll("_", "/")}
                </span>
              </span>
              <span className="text-[12px] font-bold text-orange-700">{r.why}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Stacked columns per day/week/month: card appointment fees + coin sales. */
function TrendChart({ data }: { data: FinanceData }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const points = data.trend;
  const keys = ["appointmentsCents", "coinsCents"] as const;

  const { max, ticks, totals } = useMemo(() => {
    const top = Math.max(0, ...points.map((p) => p.appointmentsCents + p.coinsCents));
    // a round axis top: 1, 2 or 5 × a power of ten, in dollars
    const dollars = Math.max(1, top / 100);
    const pow = 10 ** Math.floor(Math.log10(dollars));
    const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s * 4 >= dollars) ?? pow * 10;
    const max = step * 4 * 100;
    return {
      max,
      ticks: [0, 1, 2, 3, 4].map((i) => (i * max) / 4),
      totals: {
        appointmentsCents: points.reduce((n, p) => n + p.appointmentsCents, 0),
        coinsCents: points.reduce((n, p) => n + p.coinsCents, 0),
      },
    };
  }, [points]);

  const empty = totals.appointmentsCents + totals.coinsCents === 0;
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const shown = active !== null ? points[active] : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900">Money in over time</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Per {data.bucket}, through Stripe</p>
        </div>
        <button
          onClick={() => setAsTable((t) => !t)}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline underline-offset-2"
        >
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {/* legend with totals, so the colours are never the only label */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 mb-4">
        {keys.map((k) => (
          <span key={k} className="flex items-center gap-2 text-[12px] text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES[k].color }} />
            {SERIES[k].label} <span className="font-bold text-slate-900 tabular-nums">{money(totals[k])}</span>
          </span>
        ))}
      </div>

      {asTable ? (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="text-left font-bold px-3 py-2">{data.bucket}</th>
                <th className="text-right font-bold px-3 py-2">Appointments</th>
                <th className="text-right font-bold px-3 py-2">Coins</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.at} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-600">{bucketLabel(p.at, data.bucket)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(p.appointmentsCents)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(p.coinsCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pt-3">
          {empty && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 z-10">
              No card payments or coin sales in this period
            </p>
          )}
          <div className="flex gap-2">
            {/* y axis */}
            <div className="relative h-56 w-10 shrink-0 text-[10px] text-slate-400 tabular-nums">
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
                  {shortMoney(t)}
                </span>
              ))}
            </div>
            <div className="relative flex-1 min-w-0">
              {/* grid lines */}
              <div className="absolute inset-x-0 top-0 h-56 pointer-events-none">
                {ticks.map((t) => (
                  <div
                    key={t}
                    className={`absolute inset-x-0 border-t ${t === 0 ? "border-slate-300" : "border-slate-100"}`}
                    style={{ bottom: `${(t / max) * 100}%` }}
                  />
                ))}
              </div>
              <div className="relative h-56 flex items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
                {points.map((p, i) => {
                  const total = p.appointmentsCents + p.coinsCents;
                  return (
                    <button
                      key={p.at}
                      type="button"
                      aria-label={`${bucketLabel(p.at, data.bucket)}: appointments ${money(p.appointmentsCents)}, coins ${money(p.coinsCents)}`}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className={`relative flex-1 h-full flex flex-col justify-end outline-none rounded-t ${
                        active === i ? "bg-slate-100/80" : ""
                      }`}
                    >
                      {/* top segment first (column-reverse would flip the tab order) */}
                      {keys
                        .slice()
                        .reverse()
                        .map((k, idx, arr) => {
                          const value = p[k];
                          if (!value) return null;
                          const isTop = arr.slice(0, idx).every((other) => !p[other]);
                          return (
                            <span
                              key={k}
                              className={`block w-full max-w-6 mx-auto ${isTop ? "rounded-t-[4px]" : ""}`}
                              style={{
                                height: `${(value / max) * 100}%`,
                                background: SERIES[k].color,
                                // 2px surface gap between stacked segments
                                borderBottom: k === "coinsCents" && p.appointmentsCents ? "2px solid white" : undefined,
                                minHeight: total ? 2 : 0,
                              }}
                            />
                          );
                        })}
                    </button>
                  );
                })}
              </div>
              {/* x axis */}
              <div className="flex gap-[2px] mt-2 text-[10px] text-slate-400">
                {points.map((p, i) => (
                  <span
                    key={p.at}
                    className={`flex-1 min-w-0 whitespace-nowrap overflow-visible ${
                      i === 0 ? "text-left" : i >= points.length - labelEvery ? "text-right" : "text-center"
                    }`}
                  >
                    {i % labelEvery === 0 ? bucketLabel(p.at, data.bucket) : ""}
                  </span>
                ))}
              </div>
              {shown && (
                <div
                  className="absolute top-0 z-20 pointer-events-none rounded-xl bg-slate-900 text-white px-3 py-2 text-[12px] shadow-lg w-48"
                  style={{
                    left: `${((active! + 0.5) / points.length) * 100}%`,
                    transform: `translateX(${active! > points.length / 2 ? "-105%" : "5%"})`,
                  }}
                >
                  <p className="font-bold mb-1">
                    {data.bucket === "week" ? "Week of " : ""}
                    {bucketLabel(shown.at, data.bucket)}
                  </p>
                  {keys.map((k) => (
                    <p key={k} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-sm" style={{ background: SERIES[k].color }} />
                        {k === "appointmentsCents" ? "Appointments" : "Coins"}
                      </span>
                      <span className="font-bold tabular-nums">{money(shown[k])}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** What the clinic is holding for other people right now. */
function Owed({ data }: { data: FinanceData }) {
  const o = data.owed;
  const rows = [
    {
      label: "Care funds",
      value: money(o.careFundsCents),
      hint: `${o.careFundCount} patient${o.careFundCount === 1 ? "" : "s"} can withdraw this`,
    },
    {
      label: "Withdrawals in progress",
      value: money(o.payoutsHeldCents),
      hint: `${o.payoutsHeldCount} waiting or being sent`,
    },
    {
      label: "Unspent coins",
      value: `${o.unspentCoins.toLocaleString()} coins`,
      hint: `Up to ${money(o.unspentCoins)} of gifts or visits still to be used`,
    },
  ];
  return (
    <section className="bg-slate-900 text-white rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-teal-300">
        <RiSafe2Line size={18} />
        <h2 className="font-black">Owed right now</h2>
      </div>
      <p className="text-4xl font-black mt-3 tabular-nums">{money(o.totalCents)}</p>
      <p className="text-[12px] text-slate-400 mt-1">Money the clinic is holding for patients. Keep at least this in the account.</p>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-2xl bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-300">{r.label}</p>
              <p className="font-black tabular-nums">{r.value}</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{r.hint}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-4">
        Paid out in this period: <span className="text-slate-300 font-bold">{money(data.summary.payoutsPaidCents)}</span> (
        {data.summary.payoutsPaidCount} withdrawal{data.summary.payoutsPaidCount === 1 ? "" : "s"})
      </p>
    </section>
  );
}

/** How the period's appointment fees were paid. */
function PaymentSplit({ data }: { data: FinanceData }) {
  const { cardCents, walletCents, olderCents } = data.summary.byMethod;
  const total = cardCents + walletCents + olderCents;
  const rows = [
    { label: "Card (Stripe)", cents: cardCents },
    { label: "Wallet", cents: walletCents },
    ...(olderCents ? [{ label: "Card, before payment methods were recorded", cents: olderCents }] : []),
  ];
  return (
    <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
      <h2 className="font-black text-slate-900">How visits were paid</h2>
      <p className="text-[12px] text-slate-400 mt-0.5 mb-4">{money(total)} in appointment fees</p>
      <div className="space-y-4">
        {rows.map((r) => {
          const pct = total ? Math.round((r.cents / total) * 100) : 0;
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {money(r.cents)} <span className="text-slate-400 font-medium">· {pct}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DoctorTable({ doctors }: { doctors: FinanceData["doctors"] }) {
  if (!doctors.length) return <p className="text-sm text-slate-400 py-6 text-center">No paid visits in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="text-left font-bold px-3 py-2">Doctor</th>
            <th className="text-right font-bold px-3 py-2">Visits</th>
            <th className="hidden sm:table-cell text-right font-bold px-3 py-2">Fees</th>
            <th className="hidden sm:table-cell text-right font-bold px-3 py-2">Refunds</th>
            <th className="text-right font-bold px-3 py-2">Earned</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((d) => (
            <tr key={d.docId} className="border-t border-slate-100">
              <td className="px-3 py-2.5">
                <p className="font-bold text-slate-800">{d.name}</p>
                <p className="text-[11px] text-slate-400">
                  {[
                    d.speciality,
                    d.noShows ? `${d.noShows} patient no-show${d.noShows === 1 ? "" : "s"}` : "",
                    d.missedByDoctor ? `${d.missedByDoctor} missed by doctor` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{d.visits}</td>
              <td className="hidden sm:table-cell px-3 py-2.5 text-right tabular-nums text-slate-600">{money(d.grossCents)}</td>
              <td className="hidden sm:table-cell px-3 py-2.5 text-right tabular-nums text-slate-600">
                {d.refundCents ? `−${money(d.refundCents)}` : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums font-black text-slate-900">{money(d.netCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
