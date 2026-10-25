// The v6 voiceover (docs/DEMO-SCRIPT.md, approved 2026-10-25), one entry per sentence. Each sentence is generated on
// its own, so it is never cut or overlapped (D-110). `say` is what ElevenLabs reads: an optional v3 cue in [brackets]
// plus spelling hints ("A G", "buy-able", a comma before "in chats" so the "in" is heard); `caption` is the same words
// as shown on screen.
export const beats = [
  {
    beat: 1,
    sentences: [
      "[warm] Millions of makers, like Juniper, sell only through social posts.",
      "[thoughtful] But shopping is moving to AI agents, and an agent can't buy from a DM.",
    ],
  },
  { beat: 2, sentences: ["[cheerful] Shopfront Agent turns her photos into a store that any AI agent can buy from, paid through PayPal."] },
  {
    beat: 3,
    sentences: [
      "[cheerful] She drops in a photo, and Gemini drafts the listing for her.",
      "The price stays a guess until she confirms it.",
      "[warm] One tap, and it's live, in her store and in PayPal's catalog.",
    ],
  },
  {
    beat: 4,
    sentences: [
      "A shopper asks their AI agent for a green mug.",
      "The agent shops her store over MCP.",
      "It can choose the mug, but never the price, and it can't pay.",
      "The shopper approves in PayPal…",
      "[cheerful] and it's paid.",
      "A verified PayPal webhook confirms it.",
    ],
  },
  {
    beat: 5,
    sentences: [
      "[warm] She runs her shop from a chat on her phone.",
      "An order comes in.",
      "She snaps the shipping label, and the tracking lands on the PayPal order.",
      "A refund outside her policy waits for her tap.",
    ],
  },
  {
    beat: 6,
    sentences: [
      "Sellers sign in with PayPal, and a verified seller can get paid straight into their own PayPal.",
      "Every store also speaks PayPal's Cart API.",
      "Here's PayPal's own client buying through it, so every store is ready for Store Sync.",
    ],
  },
  {
    beat: 7,
    sentences: [
      "[curious] Can an agent be tricked into paying less?",
      "We threw thirty-one attacks at a naive shop and at Shopfront, same AI model: fake prices, in chats, photos and shipping labels, forged webhooks, replays.",
      "The naive shop made real PayPal orders at the attacker's price.",
      "[confident] Shopfront blocked all thirty-one.",
    ],
  },
  {
    beat: 8,
    sentences: [
      "Her dashboard is built on A G Grid and A G Studio.",
      "Orders group by product, and a click opens the full PayPal history.",
      "She asks for unshipped orders over fifty dollars, and the grid filters itself, with one-click undo.",
      "Her Shop Manager agent answers from her database and from PayPal, and shows every number's source.",
      "It has no tool that moves money, so a refund request gets a polite no.",
    ],
  },
  {
    beat: 9,
    sentences: [
      "[confident] No AI model ever moves money; plain code does.",
      "It all runs on one free Render service, tested live with real PayPal sandbox calls.",
    ],
  },
  { beat: 10, sentences: ["[warm] Shopfront Agent.", "Any seller, buy-able by any AI agent, paid through PayPal.", "Try it live."] },
].map((b) => ({
  ...b,
  sentences: b.sentences.map((say) => ({
    say,
    caption: say.replace(/\[[a-z ]+\]\s*/g, "").replace(/A G /g, "AG ").replace("buy-able", "buyable").replace("prices, in", "prices in"),
  })),
}));
