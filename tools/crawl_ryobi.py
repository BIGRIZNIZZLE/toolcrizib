"""Refresh RYOBI catalog from ryobitools.com public sitemap + product pages (robots.txt allows /products/).
Polite: 3 concurrent requests, identifies as ToolLog catalog bot, stops on any 403/429/captcha."""
import re, json, sys, time, urllib.request, concurrent.futures as cf, os
sys.path.insert(0, os.path.dirname(__file__)); import turbo
UA = 'Mozilla/5.0 (compatible; ToolLogCatalog/1.0; +https://bigriznizzle.github.io/toollog/)'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'ryobi-raw.jsonl'
def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': 'text/html'})
    with urllib.request.urlopen(req, timeout=40) as r: return r.status, r.read().decode('utf-8', 'replace')
blocked = False
def urls():
    _, idx = get('https://www.ryobitools.com/sitemap.xml')
    out = []
    for sm in re.findall(r'<loc>(https://www\.ryobitools\.com/sitemap/products/\d+\.xml)</loc>', idx):
        _, x = get(sm); out += re.findall(r'<loc>([^<]+)</loc>', x)
    return sorted(set(out))
def one(u):
    global blocked
    if blocked: return None
    try: st, h = get(u)
    except urllib.error.HTTPError as e:
        if e.code in (403, 429): blocked = True
        return {'url': u, 'error': e.code}
    except Exception as e: return {'url': u, 'error': str(e)[:80]}
    if re.search(r'captcha-delivery|cf-chl|Access Denied', h[:5000]): blocked = True; return {'url': u, 'error': 'blocked'}
    r = turbo.decode(h)
    try: p = next(v for k, v in r['loaderData']['routes'].items() if 'productHandle' in k)['product'] if 'routes' in r['loaderData'] else next(v for k, v in r['loaderData'].items() if 'productHandle' in k)['product']
    except Exception: return {'url': u, 'error': 'noproduct'}
    if not p: return {'url': u, 'error': 'noproduct'}
    g = lambda k: (p.get(k) or {}).get('value') if isinstance(p.get(k), dict) else p.get(k)
    img = None
    try: img = p['media']['nodes'][0]['previewImage']['url']
    except Exception: pass
    return {'url': u, 'title': p.get('title'), 'model': g('modelNumber'), 'tags': p.get('tags'), 'category': (p.get('category') or {}).get('name'),
            'collections': [c['handle'] for c in (p.get('collections') or {}).get('nodes', [])], 'specs': g('specs'), 'includes': g('productIncludes'),
            'warranty': g('warranty'), 'img': img}
if __name__ == '__main__':
    us = urls(); print(len(us), 'urls', flush=True)
    n = 0
    with open(OUT, 'w') as f, cf.ThreadPoolExecutor(3) as ex:
        for res in ex.map(one, us):
            if res: f.write(json.dumps(res) + '\n')
            n += 1
            if n % 200 == 0: print(n, flush=True)
    print('done blocked=' + str(blocked))
