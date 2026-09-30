import openpyxl
SRC = r"C:\Users\Administrator\Downloads\疯狂动物园2026.8.28.xlsx"
TARGET = ["武侠鸵鸟","百万伏特鹰","急速肥猪","双角兽（伪）","神秘骆驼","蛇女巫","急速海豚"]
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
for ws in wb.worksheets:
    rows=list(ws.iter_rows(values_only=True))
    if not rows: continue
    header=list(rows[0])
    idx={}
    for i,h in enumerate(header):
        if h is None: continue
        if str(h).strip()=="名称": idx["name"]=i
        if str(h).strip()=="获取方式": idx["get"]=i
        if str(h).strip()=="动物园": idx["zoo"]=i
        if str(h).strip()=="地图": idx["map"]=i
        if str(h).strip()=="栖息地": idx["hab"]=i
    if "name" not in idx: continue
    for r in rows[1:]:
        nm=r[idx["name"]] if idx["name"]<len(r) else None
        if nm and str(nm).strip() in TARGET:
            g=r[idx.get("get")] if idx.get("get") and idx["get"]<len(r) else None
            zoo=r[idx.get("zoo")] if idx.get("zoo") and idx["zoo"]<len(r) else None
            mp=r[idx.get("map")] if idx.get("map") and idx["map"]<len(r) else None
            hab=r[idx.get("hab")] if idx.get("hab") and idx["hab"]<len(r) else None
            print(f"名称={nm!r} | 动物园={zoo!r} | 地图={mp!r} | 栖息地={hab!r} | 获取方式={g!r}")
