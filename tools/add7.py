import json, shutil, random, string

TAX = r"F:\网站\data\taxonomy.json"
shutil.copyfile(TAX, TAX + ".bak_add7")

# (物种id, 个体名, 属性标签)  —— 个体名与 Excel「名称」一致，属性按7类规则推导
ADD = [
    ("sp_crj7tnoc", "武侠鸵鸟", "徽章/自选"),   # 鸵鸟(天空飞船/草原)
    ("sp_5esa0bkqtmg", "百万伏特鹰", "濒危"),    # 秃鹰(天空飞船/草原)
    ("sp_qov1tb6u88vg", "急速肥猪", "Boss"),     # 猪(天空飞船/丛林)
    ("sp_xxios9mk88cb", "双角兽（伪）", "Boss"), # 山羊(天空飞船/山脉)
    ("sp_8108srsv6o0u", "神秘骆驼", "濒危"),    # 骆驼(天空飞船/澳洲)
    ("sp_hdag5cm9id7", "蛇女巫", "徽章"),       # 九头蛇(时空飞船/奥林匹斯)
    ("sp_39urfcu8", "急速海豚", "PVP"),         # 海豚(海洋/海洋)
]

def rid():
    return "va_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))

tax = json.load(open(TAX, encoding="utf-8"))
roots = tax if isinstance(tax, list) else tax.get("categories", [])

targets = {sid: None for sid, _, _ in ADD}
def find(node):
    if isinstance(node, list):
        for x in node: find(x)
        return
    if isinstance(node, dict):
        if node.get("id") in targets and "variants" in node:
            targets[node["id"]] = node
        for v in node.values():
            if isinstance(v, (list, dict)): find(v)
find(roots)

added = 0
for sid, name, attr in ADD:
    sp = targets[sid]
    if sp is None:
        print(f"  [跳过] 找不到物种 {sid}")
        continue
    if any(v.get("name") == name for v in sp["variants"]):
        print(f"  [跳过] {name} 已存在于 {sid}")
        continue
    sp["variants"].append({"id": rid(), "name": name, "rarity": "common", "attr": attr})
    added += 1
    print(f"  [添加] {name} -> {sid} ({attr})")

json.dump(tax, open(TAX, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\n新增个体数: {added}")
print("保存 ->", TAX)
