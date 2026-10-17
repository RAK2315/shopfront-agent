// The /shop starter prompts. `search` starters must each find at least one product (REVIEW-1 #3); `order` starters
// are post-purchase questions. `pnpm --filter web lane-checks` runs every one through the hosted agent.
// The blue-mug starter is the recorded demo (record-demo.mts): changing its text invalidates the recording (D-055).
export const SHOP_STARTERS = [
  { text: "Find me a handmade blue mug under $40 as a gift", kind: "search" },
  { text: "A vase or table linens for a housewarming, under $60", kind: "search" },
  { text: "What's the status of my order?", kind: "order" },
  { text: "It arrived the wrong size. Can I get a refund?", kind: "order" },
] as const;
