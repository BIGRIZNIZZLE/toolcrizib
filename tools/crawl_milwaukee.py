"""Refresh Milwaukee catalog from milwaukeetool.com public category + product pages (robots.txt allows /products/;
we never touch /api/, *.aspx, ?qv=, ?bvstate=). The public sitemap.xml currently returns HTTP 500, so model numbers are
discovered from category pages and product pages' related/kit/"in the box" lists, then each one is verified by fetching
its own product page (JSON-LD sku + name + breadcrumb). Polite: 2 concurrent requests; stops on 403/429/captcha."""
import re, json, sys, html as H, urllib.request, concurrent.futures as cf, threading
UA = 'Mozilla/5.0 (compatible; ToolLogCatalog/1.0; +https://bigriznizzle.github.io/toollog/)'
BASE = 'https://www.milwaukeetool.com'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'milwaukee-raw.jsonl'
MAXP = int(sys.argv[2]) if len(sys.argv) > 2 else 2500
KEEP = re.compile(r'^(\d{4}-\d{2}[A-Z0-9]*|48-11-\d{4}|48-59-\d{4}[A-Z]*|MXF[A-Z0-9-]+|2\d{3}-\d{2}[A-Z]*)$')
blocked = False
def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': 'text/html'})
    with urllib.request.urlopen(req, timeout=45) as r: return r.geturl(), r.read().decode('utf-8', 'replace')
def skus_in(h):
    s = h.replace('\\"', '"')
    return set(x for x in re.findall(r'"sku":"([A-Z0-9-]+)"', s) if KEEP.match(x)) | set(x for x in re.findall(r'/products/details/[a-z0-9-]+/([A-Za-z0-9-]+)', s) if KEEP.match(x.upper()))
def parse(u, h):
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', h, re.S):
        try: j = json.loads(m.group(1))
        except Exception: continue
        g = j.get('@graph', [j]); prod = next((x for x in g if x.get('@type') == 'Product'), None)
        if not prod: continue
        bc = next((x for x in g if x.get('@type') == 'BreadcrumbList'), {})
        crumbs = [i['item']['name'] for i in bc.get('itemListElement', [])]
        img = prod.get('image', {}).get('@id') if isinstance(prod.get('image'), dict) else None
        hs = h.replace('\\"', '"'); inc = []
        for q, sk, t in re.findall(r'"type":"SALEABLE_ITEM","quantity":(\d+),"sku":"([^"]+)","title":"([^"]+)"', hs):
            if (sk, q) not in [(a['sku'], str(a['qty'])) for a in inc] and sk != prod.get('sku'): inc.append({'sku': sk, 'qty': int(q), 'title': H.unescape(t.encode().decode('unicode_escape', 'ignore')) if '\\u' in t else H.unescape(t)})
        return {'url': u.split('?')[0], 'title': H.unescape(prod.get('name', '')), 'model': prod.get('sku'), 'crumbs': crumbs, 'img': img, 'includes': inc}
    return None
def cats():
    _, h = get(BASE + '/products/power-tools')
    tops = ['power-tools', 'batteries-and-chargers', 'outdoor-power-equipment', 'lighting', 'instruments', 'sewer-and-drain-maintenance', 'safety-solutions', 'work-gear']
    links = sorted(set(re.findall(r'href="/products/((?:' + '|'.join(tops) + r')[a-z0-9/-]*)"', h)))
    return [l for l in links if not re.search(r'/\d', l)]
if __name__ == '__main__':
    lock = threading.Lock(); seen = set(); queue = []; results = []
    def add(ss):
        with lock:
            for s in ss:
                if s not in seen: seen.add(s); queue.append(s)
    cl = cats(); print(len(cl), 'category pages', flush=True)
    def fetch_cat(c):
        global blocked
        if blocked: return
        try: _, h = get(BASE + '/products/' + c); add(skus_in(h))
        except urllib.error.HTTPError as e:
            if e.code in (403, 429): blocked = True
        except Exception: pass
    with cf.ThreadPoolExecutor(2) as ex: list(ex.map(fetch_cat, cl))
    print(len(queue), 'seed skus', flush=True)
    done = 0
    with open(OUT, 'w') as f:
        while queue and done < MAXP and not blocked:
            batch, queue[:] = queue[:40], queue[40:]
            def one(s):
                global blocked
                try:
                    u, h = get(BASE + '/Products/' + s)
                    if re.search(r'captcha|Access Denied', h[:4000], re.I) and 'ld+json' not in h: blocked = True; return None
                    add(skus_in(h))
                    if '/products/details/' not in u.lower(): return {'sku': s, 'error': 'nodetail', 'url': u}
                    return parse(u, h) or {'sku': s, 'error': 'noparse', 'url': u}
                except urllib.error.HTTPError as e:
                    if e.code in (403, 429): blocked = True
                    return {'sku': s, 'error': e.code}
                except Exception as e: return {'sku': s, 'error': str(e)[:60]}
            with cf.ThreadPoolExecutor(2) as ex:
                for r in ex.map(one, batch):
                    if r: f.write(json.dumps(r) + '\n'); f.flush()
            done += len(batch); print(done, 'fetched,', len(queue), 'queued', flush=True)
    print('done blocked=' + str(blocked))

def sitemap_urls():
    """The robots.txt sitemap answers 500 to an HTML Accept header but serves XML when asked for XML."""
    req = urllib.request.Request(BASE + '/sitemap.xml', headers={'User-Agent': UA, 'Accept': 'application/xml'})
    with urllib.request.urlopen(req, timeout=90) as r: x = r.read().decode('utf-8', 'replace')
    out = []
    for u in sorted(set(re.findall(r'<loc>(https://www\.milwaukeetool\.com/products/details/[^<]+)</loc>', x))):
        if KEEP.match(u.rsplit('/', 1)[1].upper()): out.append(u)
    return out
