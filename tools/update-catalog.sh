#!/usr/bin/env bash
# Refresh catalog.json from the manufacturers' public product pages (robots-allowed sitemaps + product pages only;
# honest User-Agent, 2-3 requests at a time, stops on 403/429/captcha). Takes roughly 30-60 minutes.
# The old raw files are only replaced when the new crawl is at least 80% as big (a blocked or partial run never wipes the catalog).
set -euo pipefail
cd "$(dirname "$0")"
keep() { local new=$1 old=$2; local n o; n=$(wc -l < "$new"); o=$( [ -f "$old" ] && wc -l < "$old" || echo 0 ); if [ "$n" -ge $(( o * 8 / 10 )) ]; then mv "$new" "$old"; echo "$old: $o -> $n"; else echo "$old: new crawl too small ($n vs $o), keeping the old one"; rm -f "$new"; fi; }
python3 crawl_ryobi.py ryobi-raw.new.jsonl
keep ryobi-raw.new.jsonl ryobi-raw.jsonl
python3 crawl_milwaukee.py milwaukee-raw.new.jsonl
python3 crawl_milwaukee_sitemap.py milwaukee-raw.new.jsonl
keep milwaukee-raw.new.jsonl milwaukee-raw.jsonl
node build-catalog.js
echo "Review the table above, then bump CACHE in sw.js so installed apps pick up the new catalog, and commit."
