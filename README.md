# ToolLog · RIZNOSS Chamber 02 — "The Shaolin Arsenal"

Inventory for your power tools, batteries and chargers. It's a free, private, offline-first PWA.

**App:** https://bigriznizzle.github.io/toollog/ · **Invite page:** https://bigriznizzle.github.io/toollog/join/

## What it does
- **Inventory:** group by brand, tool type, battery platform, location or kit. Filter by tools, batteries or chargers, and search by name, model, serial or who has it.
- **Add from the catalog:** pick a brand, then a platform, then a type, then the model. The item fills itself in, and a kit's "in the box" pieces can be added in one step. You can also enter your own products, which are remembered for next time.
- **Details per item:** serial, purchase date, store and price paid. Price is required unless you tick free/gift. Also warranty with its end date and reminders, condition, location, who you loaned it to, compressed photos, a receipt photo and notes. A kit's price is split across its pieces.
- **Batteries:** for RYOBI ONE+ 18V / 40V / 80V / USB Lithium and Milwaukee M18 / M12 / MX FUEL / M4 / USB, see which tools run on which batteries, plus the pack count and total Ah. Each battery can also track charge cycles, health and the date it went into service.
- **Dashboard:** value of what you paid, counts, warranties ending soon, overdue loans and batteries per platform.
- **Insurance:** a CSV with every field and a printable list (save as PDF) with photos and serials. Also a JSON backup and restore, with or without photos.
- **Sync (optional):** sign in by email. Data merges per record across devices. Photos stay on the device.

## Catalog (`catalog.json`)
- Built only from the manufacturers' own public product pages, found through their robots-allowed sitemaps.
  - RYOBI: https://www.ryobitools.com/sitemap.xml
  - Milwaukee: https://www.milwaukeetool.com/sitemap.xml
- Every entry carries its source URL (`u`). Model numbers and names are exactly as published.
- Accessories, hand tools and consumables are filtered out. Tool type is ToolLog's own grouping.
- **Refresh:** run `tools/update-catalog.sh`, then bump `CACHE` in `sw.js`. The crawl uses an honest User-Agent and 2–3 requests at a time, and it stops on any block.

## Sync design
ToolLog shares the AutoLog Supabase project and its `records` table.
- **How records are stored:** each ToolLog record is a `maint` row with id `tl:<item|kit|custom>:<id>` and `data._vid = "__toollog"`.
- **AutoLog keeps them:** every AutoLog version keeps such rows as orphans, which it never shows, never rebuilds and never tombstones. `tools/test-sync-compat.js` checks this against every shipped AutoLog `sync.js`, and `tools/test-sync-live.js` checks it end to end.
- **ToolLog stays in its lane:** it only reads `tl:` rows, and it uses its own auth storage key, cache names and service-worker scope.

## Tests
Serve `/workspace` on 127.0.0.1:8813, then run:
- `node tools/test-flows.js`
- `node tools/test-ios.js` (WebKit iPhone 13)
- `node tools/test-offline.js`
- `node tools/test-sync-compat.js`
- `node tools/test-sync-live.js` (creates and deletes throwaway users)

RYOBI, ONE+, Milwaukee, M18, M12, MX FUEL, REDLITHIUM and related names are trademarks of their owners. ToolLog isn't affiliated with them.

Protect ya data.
