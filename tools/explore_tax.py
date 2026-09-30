import json
tax=json.load(open(r"F:\网站\data\taxonomy.json",encoding="utf-8"))
# 顶层结构
def top(node):
    if isinstance(node,list): return node
    if isinstance(node,dict):
        for k in ("categories","subs","species","data"):
            if k in node and isinstance(node[k],list): return node[k]
    return []
roots=top(tax)
print("顶层类型:", type(tax).__name__, " 顶层条目数:", len(roots))
# 列出顶层分类名 + 找 地图 关键词
def walk(node, path=""):
    if isinstance(node,dict):
        name=node.get("name")
        if "subs" in node and isinstance(node["subs"],list):
            for s in node["subs"]:
                walk(s, (path+"/"+str(name)) if name else path)
        if "variants" in node and isinstance(node["variants"],list):
            # 这是 species
            yield (path, name, node)
        for k,v in node.items():
            if k in ("subs","variants","categories","species"): continue
            yield from walk(v, path)
    elif isinstance(node,list):
        for x in node: yield from walk(x, path)

species=[]
for path,name,node in walk(tax):
    species.append((path,name))
print("\n顶层分类(一级)样本:")
seen=set()
for path,name,node in walk(tax):
    topcat=path.strip("/").split("/")[0] if path else "(root)"
    if topcat not in seen:
        seen.add(topcat); print("  一级:", topcat)
print("\n查找 7 个栖息地是否在本地作为物种存在:")
for key in ["鸵鸟","秃鹰","野猪","山羊","骆驼","九头蛇","海豚"]:
    hits=[(p,n) for p,n in species if n and key in str(n)]
    print(f"  {key}: {len(hits)} 命中 -> {hits[:5]}")
print("\n查找 地图关键词作为一级/二级分类:")
for key in ["稀树草原","丛林","山脉","澳洲","奥林匹斯","海洋"]:
    hits=[p for p,n in species if key in (p or "")]
    print(f"  {key}: 出现在路径 {len(hits)} 次, 样本 {hits[:3]}")
