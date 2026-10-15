"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Judge mode (D-011): one shared demo seller, no password. */
export function SellerSignIn({ handle, displayName }: { handle: string; displayName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/seller/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle }) });
        if (r.ok) router.refresh();
        else setBusy(false);
      }}
    >
      Continue as {displayName}
    </Button>
  );
}
