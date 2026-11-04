"use client";

import { RiEyeOffLine, RiHandHeartLine } from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { API_PATHS } from "@/utils/apiPath";
import axiosInstance from "@/utils/axiosInstance";

/** "Never feature me on the Wish Well": takes you off it and stops doctors putting you forward. */
export default function WishWellOptOut({ onDone, className = "" }: { onDone?: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-glass !bg-white !py-2.5 !px-4 !text-[14px] ${className}`}>
        <RiEyeOffLine size={17} /> Never feature me
      </button>
      <ConfirmDialog
        open={open}
        icon={<RiHandHeartLine size={22} />}
        title="Never feature me on the Wish Well?"
        body="If you're on it, you'll be taken off. Doctors won't be able to put you forward again."
        cancelLabel="Not now"
        confirmLabel="Yes, never feature me"
        busyLabel="Saving…"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          try {
            await axiosInstance.post(API_PATHS.WISH_WELL.OPT_OUT);
            toast.success("Done. You won't be featured on the Wish Well.");
            onDone?.();
          } catch {
            toast.error("That didn't work. Please try again.");
          }
          setOpen(false);
        }}
      />
    </>
  );
}
