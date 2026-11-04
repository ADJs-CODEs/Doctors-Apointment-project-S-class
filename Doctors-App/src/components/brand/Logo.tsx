import Link from 'next/link';

/** The product name, the same everywhere (header, footer, login). The landing page draws its own copy. */
export const BRAND = { name: 'Clarity', by: "by ADJ's CODEs" };

/** compact: drop the "by" line on phones, where the header is tight */
export default function Logo({ onClick, compact }: { onClick?: () => void; compact?: boolean }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-baseline gap-2 shrink-0 no-underline">
      <b className="text-[20px] font-extrabold tracking-[-0.5px] text-ink">{BRAND.name}</b>
      <span className={`text-[12px] font-semibold text-ink-3 whitespace-nowrap ${compact ? "hidden sm:inline" : ""}`}>{BRAND.by}</span>
    </Link>
  );
}
