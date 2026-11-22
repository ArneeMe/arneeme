"""Lager veier og stier til Tur-appen fra en OpenStreetMap-fil.

Bruk: python3 bygg.py <norge.osm.pbf> <utmappe>

Lager én fil per blokk på 0,5 grader nord-sør og 1 grad øst-vest,
veier_<by>_<bx>.bin, og indeks.json. Formatet leses av Graf.kt i appen.
"""

import gzip
import json
import math
import os
import struct
import sys

import osmium

BLOKK_LAT = 0.5
BLOKK_LON = 1.0
MERKE = 0x54555232
UTELATT = {"motorway", "motorway_link", "trunk", "trunk_link", "construction", "proposed", "platform",
           "corridor", "elevator", "raceway", "bus_guideway", "abandoned"}
TJENESTE = {"parking_aisle", "driveway", "drive-through"}
NOKLER = ("highway", "foot", "access", "sac_scale", "sidewalk", "surface")
POST = struct.Struct("<qiq")
NODE = struct.Struct("<qii")


def blokk(lat, lon):
    return math.floor(lat / BLOKK_LAT), math.floor(lon / BLOKK_LON)


class Samler(osmium.SimpleHandler):
    def __init__(self, mappe):
        super().__init__()
        self.mappe = mappe
        self.filer = {}
        self.kombinasjoner = {}
        self.veier = 0

    def fil(self, b):
        f = self.filer.get(b)
        if f is None:
            f = self.filer[b] = open(os.path.join(self.mappe, f"tmp_{b[0]}_{b[1]}"), "wb")
        return f

    def way(self, w):
        t = w.tags
        vei = t.get("highway")
        if vei is None or vei in UTELATT or t.get("service") in TJENESTE or t.get("access") in ("private", "no"):
            return
        noder = []
        for n in w.nodes:
            if not n.location.valid():
                continue
            noder.append((n.ref, round(n.location.lat * 1e6), round(n.location.lon * 1e6)))
        if len(noder) < 2:
            return
        tekst = ";".join(f"{k}={t[k]}" for k in NOKLER if k in t)
        kombinasjon = self.kombinasjoner.setdefault(tekst, len(self.kombinasjoner))
        post = POST.pack(w.id, kombinasjon, len(noder)) + b"".join(NODE.pack(*n) for n in noder)
        for b in {blokk(la / 1e6, lo / 1e6) for _, la, lo in noder}:
            self.fil(b).write(post)
        self.veier += 1


def varint(ut, v):
    while v >= 0x80:
        ut.append((v & 0x7F) | 0x80)
        v >>= 7
    ut.append(v)


def zigzag(v):
    return v * 2 if v >= 0 else -v * 2 - 1


def skriv_blokk(tmp, ut, kombinasjoner):
    data = open(tmp, "rb").read()
    veier = {}
    noder = {}
    i = 0
    while i < len(data):
        vid, k, n = POST.unpack_from(data, i)
        i += POST.size
        refs = []
        for _ in range(n):
            nid, la, lo = NODE.unpack_from(data, i)
            i += NODE.size
            refs.append(nid)
            noder[nid] = (la, lo)
        veier[vid] = (k, refs)
    brukt = sorted({k for k, _ in veier.values()})
    nytt = {k: j for j, k in enumerate(brukt)}
    b = bytearray()
    varint(b, len(brukt))
    for k in brukt:
        tekst = kombinasjoner[k].encode()
        varint(b, len(tekst))
        b += tekst
    varint(b, len(noder))
    forrige = (0, 0, 0)
    for nid in sorted(noder):
        la, lo = noder[nid]
        varint(b, nid - forrige[0])
        varint(b, zigzag(la - forrige[1]))
        varint(b, zigzag(lo - forrige[2]))
        forrige = (nid, la, lo)
    varint(b, len(veier))
    forrige_id = 0
    for vid in sorted(veier):
        k, refs = veier[vid]
        varint(b, vid - forrige_id)
        forrige_id = vid
        varint(b, nytt[k])
        varint(b, len(refs))
        sist = 0
        for r in refs:
            varint(b, zigzag(r - sist))
            sist = r
    with gzip.open(ut, "wb", compresslevel=9) as f:
        f.write(struct.pack(">i", MERKE))
        f.write(b)
    return len(veier), len(noder)


def main():
    kilde, mappe = sys.argv[1], sys.argv[2]
    os.makedirs(mappe, exist_ok=True)
    s = Samler(mappe)
    s.apply_file(kilde, locations=True, idx="flex_mem")
    for f in s.filer.values():
        f.close()
    kombinasjoner = {v: k for k, v in s.kombinasjoner.items()}
    blokker = []
    for b in sorted(s.filer):
        tmp = os.path.join(mappe, f"tmp_{b[0]}_{b[1]}")
        navn = f"veier_{b[0]}_{b[1]}.bin"
        veier, noder = skriv_blokk(tmp, os.path.join(mappe, navn), kombinasjoner)
        os.remove(tmp)
        blokker.append({"fil": navn, "by": b[0], "bx": b[1], "veier": veier, "noder": noder,
                        "bytes": os.path.getsize(os.path.join(mappe, navn))})
        print(f"{navn}: {veier} veier, {noder} noder, {blokker[-1]['bytes'] // 1024} kB", flush=True)
    json.dump({"blokk_lat": BLOKK_LAT, "blokk_lon": BLOKK_LON, "veier": blokker}, open(os.path.join(mappe, "indeks.json"), "w"))
    print(f"{s.veier} veier i {len(blokker)} blokker")


if __name__ == "__main__":
    main()
