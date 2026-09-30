import openpyxl
p = r"C:\Users\Administrator\Downloads\疯狂动物园2026.8.28.xlsx"
wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
for ws in wb.worksheets:
    print("=== SHEET:", ws.title, "===")
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        continue
    header = list(rows[0])
    # 打印所有列名（带索引）
    for i, h in enumerate(header):
        print(f"  col[{i}] = {repr(h)}")
    print("\n--- 前 5 行样本（所有列）---")
    for r in rows[1:6]:
        for i, h in enumerate(header):
            val = r[i] if i < len(r) else None
            print(f"  {h} = {repr(val)}")
        print("  " + "-"*30)
