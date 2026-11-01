#!/usr/bin/env python3
"""
Passive HAR analyser. Reads a HAR exported from Chrome/Brave DevTools
(Network tab -> Export HAR) and summarises headers, caching, payload
weight and third-party usage. It makes NO network requests.

Usage: python3 har_audit.py capture.har
"""
import json, re, sys
from collections import Counter
from urllib.parse import urlparse

SEC_HEADERS = [
    "strict-transport-security", "content-security-policy",
    "x-content-type-options", "x-frame-options", "referrer-policy",
    "permissions-policy", "cross-origin-opener-policy",
]

def hmap(headers):
    return {h["name"].lower(): h["value"] for h in headers}

def main(path):
    har = json.load(open(path))
    entries = har["log"]["entries"]
    first_party = urlparse(entries[0]["request"]["url"]).netloc
    own = [e for e in entries if urlparse(e["request"]["url"]).netloc == first_party]

    print(f"== Overview ==\nentries: {len(entries)}  first-party: {len(own)}  origin: {first_party}")
    print("page timings (ms):", {k: round(v) for k, v in har["log"]["pages"][0]["pageTimings"].items()})
    print("status codes:", dict(Counter(e["response"]["status"] for e in entries)))

    print("\n== Third-party hosts ==")
    for host, n in Counter(urlparse(e["request"]["url"]).netloc for e in entries
                           if urlparse(e["request"]["url"]).netloc != first_party).items():
        print(f"  {host}: {n} request(s)")

    print("\n== Security header coverage (first-party responses) ==")
    for name in SEC_HEADERS:
        n = sum(1 for e in own if name in hmap(e["response"]["headers"]))
        print(f"  {name:32s} {n}/{len(own)}")
    if any(e["response"]["status"] == 304 for e in own):
        print("  NOTE: some responses were 304 and carry only a subset of headers; re-capture with 'Disable cache'.")

    wire = sum(e["response"].get("_transferSize") or 0 for e in entries)
    wire_own = sum(e["response"].get("_transferSize") or 0 for e in own)
    print(f"\ntransferred over the wire: {wire:,} B total, {wire_own:,} B first-party")

    print("\n== Heaviest resources (decoded bytes) ==")
    for e in sorted(entries, key=lambda e: e["response"]["content"].get("size", 0), reverse=True)[:8]:
        print(f"  {e['response']['content'].get('size',0):>9,}  {e['request']['url'][:100]}")

    js = sum(e["response"]["content"].get("size", 0) for e in own if e.get("_resourceType") == "script")
    css = sum(e["response"]["content"].get("size", 0) for e in own if e.get("_resourceType") == "stylesheet")
    print(f"\nfirst-party JS (decoded): {js:,} B   CSS (decoded): {css:,} B")

    print("\n== Cache behaviour of RSC / route requests ==")
    for e in own:
        if "_rsc=" in e["request"]["url"]:
            h = hmap(e["response"]["headers"])
            print(f"  {e['response']['status']} {e['time']:>5.0f}ms  "
                  f"{h.get('x-vercel-cache','-'):5s} {h.get('cache-control','-')[:45]:45s} "
                  f"{urlparse(e['request']['url']).path}")

    print("\n== Cookies set by first party ==")
    print("  ", sum(len(e["response"].get("cookies", [])) for e in own), "Set-Cookie header(s)")

    print("\n== Pattern scan of captured JS/HTML (not a full secrets audit) ==")
    pat = re.compile(r"(AIza[0-9A-Za-z_-]{30,}|sk_(live|test)_\w+|-----BEGIN [A-Z ]+KEY-----|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})")
    hits = 0
    for e in entries:
        c = e["response"]["content"]
        if c.get("encoding") == "base64":
            continue
        for m in pat.finditer(c.get("text") or ""):
            hits += 1
            print("  possible secret in", e["request"]["url"][:80], m.group(0)[:12] + "...")
    print("  matches:", hits)

if __name__ == "__main__":
    main(sys.argv[1])
