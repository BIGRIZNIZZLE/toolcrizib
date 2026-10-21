"""Decode React Router / Remix turbo-stream loader data embedded in a page."""
import re, json
def decode(html):
    chunks = re.findall(r'streamController\.enqueue\((".*?")\);', html, re.S)
    if not chunks: return None
    s = ''.join(json.loads(c) for c in chunks)
    arr = json.loads(s.split('\n')[0])
    memo = {}
    def dec(i):
        if not isinstance(i, int) or i < 0: return None
        if i in memo: return memo[i]
        v = arr[i]
        if isinstance(v, list):
            if v and isinstance(v[0], str) and len(v[0]) == 1: memo[i] = None; return None
            out = []; memo[i] = out
            out.extend(dec(x) for x in v); return out
        if isinstance(v, dict):
            out = {}; memo[i] = out
            for k, x in v.items(): out[arr[int(k[1:])]] = dec(x)
            return out
        memo[i] = v; return v
    return dec(0)
