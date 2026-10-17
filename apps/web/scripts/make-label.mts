// Renders a placeholder USPS shipping label with a made-up tracking number (D-013) for AT-4 #5.
// Usage: node --import tsx scripts/make-label.mts <out.png>
import { chromium } from "@playwright/test";
const out = process.argv[2]!;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 800, height: 1100 } });
await p.setContent(`<body style="margin:0;font-family:Arial;background:#fff"><div style="margin:30px;border:4px solid #000;padding:24px;height:960px">
<div style="font-size:64px;font-weight:900">USPS PRIORITY MAIL</div><hr style="border:3px solid #000">
<div style="font-size:22px">FROM: Juniper Clay Studio, 12 Kiln Rd, Asheville NC 28801</div>
<div style="font-size:30px;margin:40px 0">SHIP TO:<br><b>A. Buyer<br>400 Market St<br>San Jose CA 95113</b></div><hr style="border:3px solid #000">
<div style="font-size:30px;font-weight:700">USPS TRACKING # </div>
<div style="font-size:44px;font-family:monospace;letter-spacing:3px;margin:16px 0">9400 1112 0206 2178 4415 29</div>
<div style="height:140px;background:repeating-linear-gradient(90deg,#000 0 3px,#fff 3px 6px,#000 6px 8px,#fff 8px 13px)"></div></div></body>`);
await p.screenshot({ path: out });
await b.close();
