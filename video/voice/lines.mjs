// The voiceover, one line per beat (docs/DEMO-SCRIPT.md v5.1). `say` is what ElevenLabs reads (light v3 cues, at most
// one per sentence; "A G" so it spells the letters); `caption` is the same words as shown on screen.
export const VOICE = { id: "iP95p4xoKVk53GoZ742B", name: "Chris", model: "eleven_v3", stability: 0.5, tempo: 1.1 };

export const lines = [
  {
    beat: 1,
    say: "[warm] Millions of makers sell only through social posts, like Juniper's pottery studio. [thoughtful] But shopping now starts with AI agents, and an agent can't buy from a DM.",
  },
  { beat: 2, say: "Shopfront Agent turns her photos into a store any AI agent can buy from, paid through PayPal." },
  {
    beat: 3,
    say: "She drops in a photo. Gemini drafts the listing and marks every field it filled. The price stays a guess until she confirms it herself. One tap, and it's live in her store and mirrored into PayPal's catalog.",
  },
  {
    beat: 4,
    say: "A shopper asks an AI agent for a green mug under forty dollars. The agent shops her store over MCP, and it can only send product IDs and quantities. The price always comes from her catalog, on our server. The agent can't pay. The human approves in PayPal, and a signature-verified webhook confirms it.",
  },
  {
    beat: 5,
    say: "[warm] She runs the rest from a chat on her phone. The order pings her. She snaps the shipping label, and the tracking lands on the PayPal order. A refund outside her policy waits for her tap. Small ones follow her rules automatically.",
  },
  {
    beat: 6,
    say: "Sellers connect with Log in with PayPal, and only a verified account gets paid, straight into its own PayPal. Every store also speaks PayPal's Cart API: here, PayPal's own client shops through it. So every store is ready for Store Sync.",
  },
  {
    beat: 7,
    say: "[curious] Can an agent be tricked into a cheaper price? We ran thirty-one attacks on a naive shop and on Shopfront, with the same AI model: injections in chat, prices hidden in photos and shipping labels, forged webhooks, replays. The naive shop made real PayPal orders at the attacker's price. Shopfront blocked all thirty-one.",
  },
  {
    beat: 8,
    say: "Her dashboard runs on A G Grid and A G Studio. Orders group by product, a click opens the full PayPal history, and new sales appear live. She asks for unshipped orders over fifty dollars, and the grid filters itself, with one-click undo. The Studio report joins orders, payments, refunds and agent carts. Its Shop Manager agent answers from her database and from PayPal, and labels every number's source. It has no tool that moves money, so a refund request gets a polite no. Every change it makes is listed and undoable, and her books are checked against PayPal on every run.",
  },
  {
    beat: 9,
    say: "[confident] No model ever moves money; that's plain code. It all runs on one free Render service, and every feature is tested against this live deployment, with real PayPal sandbox calls.",
  },
  { beat: 10, say: "[warm] Shopfront Agent. Any seller, buy-able by any AI agent, paid through PayPal. Try it live." },
].map((l) => ({
  ...l,
  caption: l.say
    .replace(/\[[a-z ]+\]\s*/g, "")
    .replace(/A G /g, "AG ").replace("buy-able", "buyable"),
}));
