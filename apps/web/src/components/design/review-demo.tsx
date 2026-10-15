"use client";

import { useState } from "react";
import { Sparkle } from "lucide-react";
import { ConfidenceField } from "@/components/ui/confidence-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Seller reviews an AI-drafted listing: low-confidence fields flagged, price must be confirmed. */
export function ReviewDemo() {
  const [title, setTitle] = useState("Speckled stoneware cup");
  const [material, setMaterial] = useState("Glazed porcelain");
  const [price, setPrice] = useState("34.00");
  const [confirmed, setConfirmed] = useState(false);
  const [published, setPublished] = useState(false);

  return (
    <div className="grid gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-md font-semibold">Review draft listing</h3>
        <Badge tone="clay">
          <Sparkle aria-hidden />
          Drafted from 1 photo
        </Badge>
      </div>
      <ConfidenceField label="Title" value={title} onChange={setTitle} confidence={0.93} />
      <ConfidenceField label="Material" value={material} onChange={setMaterial} confidence={0.58} />
      <ConfidenceField
        label="Price"
        kind="price"
        value={price}
        onChange={(v) => {
          setPrice(v);
          setConfirmed(false);
          setPublished(false);
        }}
        confidence={0.4}
        confirmed={confirmed}
        onConfirm={() => setConfirmed(true)}
      />
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-ink-2">{confirmed ? "Ready to publish to your store and PayPal." : "Confirm the price to publish."}</p>
        <Button disabled={!confirmed || published} onClick={() => setPublished(true)}>
          {published ? "Published" : "Approve listing"}
        </Button>
      </div>
    </div>
  );
}
