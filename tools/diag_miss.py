import openpyxl, json, re, difflib
SRC = r"C:\Users\Administrator\Downloads\疯狂动物园2026.8.28.xlsx"
TAX = r"F:\网站\data\taxonomy.json"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
excel_get={}
for ws in wb.worksheets:
    rows=list(ws.iter_rows(values_only=True))
    if not rows: continue
    header=list(rows[0]); ni=gi=None
    for i,h in enumerate(header):
        if h is None: continue
        if str(h).strip()=="名称": ni=i
        if "获取" in str(h) and "方式" in str(h): gi=i
    if ni is None or gi is None: continue
    for r in rows[1:]:
        name=r[ni] if ni<len(r) else None; g=r[gi] if gi<len(r) else None
        if name and str(name).strip() and g and str(g).strip():
            excel_get[str(name).strip()]=str(g).strip()

tax_va={}
def collect(n,out):
    if isinstance(n,dict):
        if "variants" in n and isinstance(n["variants"],list):
            for v in n["variants"]:
                if isinstance(v,dict) and v.get("name"): out[str(v["name"]).strip()]=v
        for k,vv in n.items(): collect(vv,out)
    elif isinstance(n,list):
        for x in n: collect(x,out)
collect(json.load(open(TAX,encoding="utf-8")), tax_va)

def norm(s):
    s=str(s).strip().replace("（","(").replace("）",")").replace("　","")
    return re.sub(r"\s+","",s).lower()

tax_norm={norm(k):k for k in tax_va}
print("=== 27(实际)未命中名 + 模糊候选 ===")
for nm,g in excel_get.items():
    if nm not in tax_va:
        cand=difflib.get_close_matches(norm(nm), tax_norm.keys(), n=1, cutoff=0.8)
        best=tax_norm[cand[0]] if cand else "—"
        print(f"  Excel: {nm!r:20} 获取方式={g!r:30} 候选={best!r}")
