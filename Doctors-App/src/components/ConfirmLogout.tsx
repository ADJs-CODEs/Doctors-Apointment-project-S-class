"use client";

import { RiLogoutCircleRLine } from "@remixicon/react";
import ConfirmDialog from "./ConfirmDialog";

/** "Are you sure?" before logging out (same idea as the admin panel's). */
export default function ConfirmLogout({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <ConfirmDialog
      open={open}
      danger
      icon={<RiLogoutCircleRLine size={22} />}
      title="Log out?"
      body="You'll stop getting reminders on this device until you log back in."
      cancelLabel="Stay logged in"
      confirmLabel="Log out"
      busyLabel="Logging out…"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
