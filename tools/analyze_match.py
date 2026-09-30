import openpyxl, json, re

# 1) 收集 Excel 名称 -> 获取方式
SRC = r"C:\Users\Administrator\Downloads\疯狂动物园2026.8.28.xlsx"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
excel_name_map = {}   # name -> 获取方式
excel_names = set()
for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if not rows: continue
    header = list(rows[0])
    # 找“名称”和“获取方式”列
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
            excel_names.add(nm)
            if g and str(g).strip():
                excel_name_map.setdefault(nm, str(g).strip())

print("Excel 唯一名称数:", len(excel_names))

# 2) 收集 taxonomy 的 sp.name 与 va.name
with open(r"F:\网站\data\taxonomy.json", encoding="utf-8") as f:
    tax = json.load(f)

sp_names=set(); va_names=set(); sp_count=0; va_count=0
def walk(node):
    global sp_count, va_count
    if isinstance(node, dict):
        # 物种节点通常有 name + variants
        if "variants" in node and isinstance(node["variants"], list):
            sp_count+=1
            if node.get("name"): sp_names.add(str(node["name"]).strip())
            for v in node["variants"]:
                if isinstance(v,dict):
                    va_count+=1
                    if v.get("name"): va_names.add(str(v["name"]).strip())
        for k,v in node.items():
            walk(v)
    elif isinstance(node,list):
        for x in node: walk(x)
walk(tax)
print("taxonomy species 数:", sp_count, " 个体数:", va_count)
print("taxonomy 唯一 sp.name:", len(sp_names), " 唯一 va.name:", len(va_names))

# 3) 匹配率
sp_exact = excel_names & sp_names
va_exact = excel_names & va_names
print("\nExcel名称 精确命中 sp.name 数:", len(sp_exact))
print("Excel名称 精确命中 va.name 数:", len(va_exact))

# 4) 未命中的 Excel 名称抽样
miss = excel_names - sp_names - va_names
print("\n未命中(Excel名称在taxonomy两边都找不到) 数:", len(miss))
print("未命中抽样:")
for n in list(miss)[:40]:
    print("   ", repr(n))

# 5) taxonomy 中有但 Excel 没有的 sp.name 抽样（用于了解差异）
extra = sp_names - excel_names
print("\ntaxonomy sp.name 不在 Excel 的 数:", len(extra))
print("抽样:")
for n in list(extra)[:30]:
    print("   ", repr(n))
