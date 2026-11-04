import type { ReactNode } from "react";

/** The small glossy tile an icon sits in (card headings, list rows). */
export default function IconTile({
  children,
  tone = "brand",
  size = "sm",
}: {
  children: ReactNode;
  tone?: "brand" | "rose" | "video";
  size?: "sm" | "md";
}) {
  const tones = {
    brand: "text-brand-ink border-[#C4E8E5] bg-[linear-gradient(180deg,#EFFAF9,#D3F0EE)] shadow-[inset_0_1px_0_#fff]",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    video: "text-video bg-video-soft border-violet-100",
  };
  return (
    <span
      className={`shrink-0 grid place-items-center border ${size === "md" ? "w-11 h-11 rounded-[14px]" : "w-8 h-8 rounded-[10px]"} ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
