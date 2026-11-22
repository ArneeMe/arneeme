"""Lager høyde til Tur-appen fra Kartverkets terrengmodell (WCS).

Bruk: python3 hoyde.py <indeks.json> <utmappe> [fil med blokker som alt finnes]

Lager hoyde_<by>_<bx>.bin for hver blokk i indeks.json: et rutenett på
1500 × 1500 punkter i hele meter, i lengde- og breddegrad, gzip-komprimert.
"""

import gzip
import json
import os
import struct
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import numpy as np
from osgeo import gdal, osr

gdal.UseExceptions()

WCS = os.environ.get("HOYDE_WCS", "https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25833")
MERKE = 0x54555248
N = 1500
UTM = 25833


def hent(url):
    req = urllib.request.Request(url, headers={"User-Agent": "arnee.me turdata"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def dekning():
    xml = hent(WCS + "?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCapabilities")
    rot = ET.fromstring(xml)
    navn = [e.text for e in rot.iter() if e.tag.endswith("}name") and e.text]
    print("Dekninger:", navn, flush=True)
    dtm = [n for n in navn if "dtm" in n.lower()]
    return (dtm or navn)[0]


def utm_boks(sor, vest, nord, ost):
    fra = osr.SpatialReference()
    fra.ImportFromEPSG(4326)
    fra.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    til = osr.SpatialReference()
    til.ImportFromEPSG(UTM)
    t = osr.CoordinateTransformation(fra, til)
    hjorner = [t.TransformPoint(lo, la) for la in (sor, nord) for lo in (vest, ost)]
    xs = [h[0] for h in hjorner]
    ys = [h[1] for h in hjorner]
    return min(xs), min(ys), max(xs), max(ys)


def blokk(dekning, sor, vest, nord, ost, mappe):
    x0, y0, x1, y1 = utm_boks(sor, vest, nord, ost)
    tif = os.path.join(mappe, "hoyde.tif")
    siste = None
    for format in ("GeoTIFF", "GTiff", "image/tiff"):
        url = WCS + "?" + urllib.parse.urlencode({
            "SERVICE": "WCS", "VERSION": "1.0.0", "REQUEST": "GetCoverage", "COVERAGE": dekning,
            "CRS": f"EPSG:{UTM}", "BBOX": f"{x0:.0f},{y0:.0f},{x1:.0f},{y1:.0f}",
            "WIDTH": str(N), "HEIGHT": str(N), "FORMAT": format,
        })
        try:
            data = hent(url)
        except Exception as e:
            siste = e
            continue
        if data[:4] in (b"II*\x00", b"MM\x00*"):
            open(tif, "wb").write(data)
            break
        siste = data[:300]
    else:
        raise RuntimeError(f"Fikk ikke høyde: {siste}")
    ut = gdal.Warp("", tif, format="MEM", dstSRS="EPSG:4326", outputBounds=(vest, sor, ost, nord),
                   width=N, height=N, resampleAlg="bilinear", dstNodata=-32768)
    b = ut.GetRasterBand(1)
    a = b.ReadAsArray().astype(np.float64)
    nodata = b.GetNoDataValue()
    tom = ~np.isfinite(a) | (a < -500) | (a > 3000)
    if nodata is not None:
        tom |= a == nodata
    rutenett = np.where(tom, -32768, np.round(a)).astype(">i2")
    os.remove(tif)
    return rutenett, int((~tom).sum())


def main():
    indeks = json.load(open(sys.argv[1]))
    mappe = sys.argv[2]
    finnes = set(open(sys.argv[3]).read().split()) if len(sys.argv) > 3 else set()
    os.makedirs(mappe, exist_ok=True)
    dekning_navn = dekning()
    laget = feilet = 0
    for v in indeks["veier"]:
        by, bx = v["by"], v["bx"]
        navn = f"hoyde_{by}_{bx}.bin"
        if navn in finnes:
            continue
        sor, vest = by * indeks["blokk_lat"], bx * indeks["blokk_lon"]
        nord, ost = sor + indeks["blokk_lat"], vest + indeks["blokk_lon"]
        try:
            rutenett, punkter = blokk(dekning_navn, sor, vest, nord, ost, mappe)
        except Exception as e:
            print(f"{navn}: feilet: {e}", flush=True)
            feilet += 1
            continue
        if punkter == 0:
            print(f"{navn}: ingen høyde her", flush=True)
            continue
        with gzip.open(os.path.join(mappe, navn), "wb", compresslevel=9) as f:
            f.write(struct.pack(">iiidddd", MERKE, N, N, sor, vest, nord, ost))
            f.write(rutenett.tobytes())
        laget += 1
        print(f"{navn}: {punkter} punkter, {os.path.getsize(os.path.join(mappe, navn)) // 1024} kB", flush=True)
    print(f"{laget} høydeblokker laget, {feilet} feilet")


if __name__ == "__main__":
    main()
