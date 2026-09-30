import openpyxl, json, re, shutil, difflib

SRC = r"C:\Users\Administrator\Downloads\疯狂动物园2026.8.28.xlsx"
TAX = r"F:\网站\data\taxonomy.json"
BAK = r"F:\网站\data\taxonomy.json.bak_attr"

# ---------- 1) 从 Excel 构建 名称 -> 获取方式 ----------
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
excel_get = {}   # name -> 获取方式(原始)
for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if not rows: continue
    header = list(rows[0])
    ni = gi = None
    for i,h in enumerate(header):
        if h is None: continue
        if str(h).strip()=="名称": ni=i
        if "获取" in str(h) and "方式" in str(h): gi=i
    if ni is None or gi is None: continue
    for r in rows[1:]:
        name = r[ni] if ni<len(r) else None
        g = r[gi] if gi<len(r) else None
        if name and str(name).strip():
            nm=str(name).strip()
            if g and str(g).strip():
                excel_get[nm]=str(g).strip()

print("Excel 名称->获取方式 条数:", len(excel_get))

# ---------- 2) 计算属性标签 ----------
# 7 类映射：来源关键词 -> (class标签, 原始短词)
MAP = [
    ("自选礼包", "付费", "自选"),
    ("徽章商城", "徽章", "徽章"),
    ("濒危动物", "濒危", "濒危"),
    ("pvp",     "PVP",  "PVP"),
    ("boss动物", "Boss", "Boss"),
    ("隐藏动物", "隐藏", "隐藏"),
    ("抽奖轮盘", "轮盘", "轮盘"),
]

def classify(cell):
    if not cell: return []
    parts=[p.strip() for p in str(cell).split("\n") if p.strip()]
    hits=[]  # (class, short)
    for p in parts:
        pl=p.lower()
        for kw,cls,short in MAP:
            if kw in pl:
                hits.append((cls,short)); break
    return hits

def label_of(cell):
    hits=classify(cell)
    if not hits: return ""
    if len(hits)==1:
        return hits[0][0]   # 单体 -> 7类标签
    # 组合 -> 原始短词用 / 连接（如 徽章/自选），仅含 7类来源
    return "/".join(h[1] for h in hits)

# 预先算好每个 Excel 名称的标签
excel_label={nm:label_of(g) for nm,g in excel_get.items()}

# ---------- 3) 模糊补匹配（针对未命中名） ----------
def norm(s):
    s=str(s).strip()
    s=s.replace("（","(").replace("）",")").replace("　","")
    s=re.sub(r"\s+","",s)
    return s.lower()
tax_va_norm={}
# 先收集 taxonomy 个体名
def collect(node, out):
    if isinstance(node,dict):
        if "variants" in node and isinstance(node["variants"],list):
            for v in node["variants"]:
                if isinstance(v,dict) and v.get("name"):
                    out[str(v["name"]).strip()]=v
        for k,v in node.items(): collect(v,out)
    elif isinstance(node,list):
        for x in node: collect(x,out)
tax_va={}
collect(json.load(open(TAX,encoding="utf-8")), tax_va)
for nm,v in tax_va.items(): tax_va_norm[norm(nm)]=nm

fuzzy_used={}
miss=[nm for nm in excel_label if nm not in tax_va]
for nm in miss:
    key=norm(nm)
    if key in tax_va_norm:
        fuzzy_used[nm]=tax_va_norm[key]
        continue
    # difflib 兜底
    cand=difflib.get_close_matches(key, tax_va_norm.keys(), n=1, cutoff=0.9)
    if cand:
        fuzzy_used[nm]=tax_va_norm[cand[0]]

print("精确未命中数:", len(miss), " 模糊补命中:", len(fuzzy_used))
for k,v in fuzzy_used.items():
    print(f"  模糊: {k!r} -> {v!r}  (原标签 {excel_label[k]!r})")

# ---------- 4) 构建 tax名称 -> 标签 映射并写入 ----------
shutil.copyfile(TAX, BAK)
print("已备份 ->", BAK)

# tax 名 -> 标签（精确 + 模糊）
tax_to_label={}
for ename,lab in excel_label.items():
    if ename in tax_va:
        tax_to_label[ename]=lab
for ename,tname in fuzzy_used.items():
    tax_to_label[tname]=excel_label[ename]

# 人工确认的高置信别名（Excel名 -> taxonomy确切名）
ALIASES={
    "梦幻离奇鹿": "幻梦离奇鹿",   # 梦/幻互换，同一只，获取方式=自选礼包
}
for ename,tname in ALIASES.items():
    if ename in excel_label and tname in tax_va:
        tax_to_label[tname]=excel_label[ename]
        print(f"别名应用: {ename!r} -> {tname!r} ({excel_label[ename]})")

tax=json.load(open(TAX,encoding="utf-8"))
set_count=0; cleared=0
def apply_attr(node):
    global set_count, cleared
    if isinstance(node,dict):
        if "variants" in node and isinstance(node["variants"],list):
            for v in node["variants"]:
                if isinstance(v,dict) and v.get("name"):
                    nm=str(v["name"]).strip()
                    if nm in tax_to_label:
                        lab=tax_to_label[nm]
                        if lab:
                            v["attr"]=lab; set_count+=1
                        else:
                            if "attr" in v: del v["attr"]; cleared+=1
                    # 不在 Excel 覆盖范围内 -> 保留现有 attr，不动
        for k,vv in node.items(): apply_attr(vv)
    elif isinstance(node,list):
        for x in node: apply_attr(x)
apply_attr(tax)

json.dump(tax, open(TAX,"w",encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\n写入完成：设置 attr 个体数={set_count}  清除(Excel覆盖但非7类)={cleared}")

# ---------- 5) 统计标签分布 ----------
from collections import Counter
cnt=Counter()
def stat(node):
    if isinstance(node,dict):
        if "variants" in node and isinstance(node["variants"],list):
            for v in node["variants"]:
                if isinstance(v,dict) and v.get("attr"):
                    cnt[v["attr"]]+=1
        for k,vv in node.items(): stat(vv)
    elif isinstance(node,list):
        for x in node: stat(x)
stat(tax)
print("\n标签分布:")
for k,v in cnt.most_common():
    print(f"  {k}: {v}")
