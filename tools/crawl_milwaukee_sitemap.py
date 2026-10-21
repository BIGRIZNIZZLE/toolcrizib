"""Second pass: every tool/battery/charger detail page listed in milwaukeetool.com/sitemap.xml (appends to the raw file)."""
import json, sys, concurrent.futures as cf, urllib.error
import crawl_milwaukee as c
OUT = sys.argv[1] if len(sys.argv) > 1 else 'milwaukee-raw.jsonl'
have = set()
for l in open(OUT):
    j = json.loads(l)
    if 'error' not in j: have.add(j['model'].upper())
us = [u for u in c.sitemap_urls() if u.rsplit('/', 1)[1].upper() not in have]
print(len(us), 'new urls', flush=True)
blocked = False
def one(u):
    global blocked
    if blocked: return None
    try:
        uu, h = c.get(u); return c.parse(uu, h) or {'sku': u.rsplit('/', 1)[1], 'error': 'noparse', 'url': u}
    except urllib.error.HTTPError as e:
        if e.code in (403, 429): blocked = True
        return {'sku': u.rsplit('/', 1)[1], 'error': e.code, 'url': u}
    except Exception as e: return {'sku': u.rsplit('/', 1)[1], 'error': str(e)[:60], 'url': u}
n = 0
with open(OUT, 'a') as f, cf.ThreadPoolExecutor(2) as ex:
    for r in ex.map(one, us):
        if r: f.write(json.dumps(r) + '\n'); f.flush()
        n += 1
        if n % 50 == 0: print(n, flush=True)
print('done blocked=' + str(blocked))
