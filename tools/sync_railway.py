#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把国内站(yodo1.cn)的最新内容同步到 Railway 海外独立站。
仅依赖标准库，无需安装任何包。

做什么：
  1. 把本地 data/taxonomy.json、data/settings.json 推到 Railway（保证分类/帽子/版本动态一致）
  2. 把 206 顶帽子图从 yodo1 后端下载，再上传到 Railway 后端（帽子图只在 yodo1 PVC，没进 git）

用法（在本机或能同时访问两个站点的机器上执行）：
  python tools/sync_railway.py --token <Railway管理员口令>

可选参数：
  --railway-base https://rodeostampede.up.railway.app
  --yodo1-base   https://api.rodeosocial.yodo1.cn
  --workers 8
  --no-data      只传图，不覆盖 taxonomy/settings
  --verify-only  只检查 Railway 是否缺帽子图，不实际上传
"""
import argparse, json, os, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def http(method, url, token=None, data=None, ctype=None, timeout=60):
    req = urllib.request.Request(url, data=data, method=method)
    if token:
        req.add_header("X-Admin-Token", token)
    if ctype:
        req.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # 网络抖动
        return -1, str(e).encode("utf-8")


def slot_url(base, slot):
    return base + "/api/img/" + urllib.parse.quote(slot, safe="")


def hat_slots():
    tax = json.load(open(os.path.join(DATA, "taxonomy.json"), encoding="utf-8"))
    hats = [c for c in tax if c.get("id") == "cat_hat"]
    if not hats:
        return []
    return ["sp:" + s["id"] for s in hats[0].get("species", [])]


def put_json(base, token, path, fname):
    body = open(os.path.join(DATA, fname), "rb").read()
    st, _ = http("PUT", base + path, token, body, "application/json")
    print(f"  PUT {path}: HTTP {st} ({'OK' if st == 200 else 'FAIL'})")
    return st == 200


def sync_one(slot, yb, rb, token, retries=5):
    for i in range(retries):
        st, data = http("GET", slot_url(yb, slot), timeout=60)
        if st != 200 or not data:
            continue
        st2, _ = http("PUT", slot_url(rb, slot), token, data, "image/png", timeout=120)
        if st2 == 200:
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--railway-base", default="https://rodeostampede.up.railway.app")
    ap.add_argument("--yodo1-base", default="https://api.rodeosocial.yodo1.cn")
    ap.add_argument("--token", required=True, help="Railway 管理员口令")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--no-data", action="store_true", help="只传图，不覆盖 taxonomy/settings")
    ap.add_argument("--verify-only", action="store_true", help="只检查缺图，不上传")
    a = ap.parse_args()

    if not a.no_data and not a.verify_only:
        print("== 1/2 推送 taxonomy + settings ==")
        put_json(a.railway_base, a.token, "/api/taxonomy", "taxonomy.json")
        put_json(a.railway_base, a.token, "/api/settings", "settings.json")

    slots = hat_slots()
    print(f"== 2/2 帽子图同步（共 {len(slots)} 张）==")
    if a.verify_only:
        miss = 0
        for s in slots:
            st, _ = http("GET", slot_url(a.railway_base, s), timeout=30)
            if st != 200:
                miss += 1
        print(f"  Railway 缺失帽子图: {miss}/{len(slots)}")
        return

    ok = 0
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(sync_one, s, a.yodo1_base, a.railway_base, a.token): s for s in slots}
        for i, f in enumerate(as_completed(futs), 1):
            if f.result():
                ok += 1
            if i % 25 == 0 or i == len(slots):
                print(f"  进度 {i}/{len(slots)}  已成功 {ok}")
    print(f"完成：成功 {ok}/{len(slots)}。失败 {len(slots)-ok} 张可重跑本脚本补传。")


if __name__ == "__main__":
    main()
