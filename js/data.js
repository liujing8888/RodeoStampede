/* =========================================================
   疯狂动物园 · 数据层（可编辑活数据）
   分类 → 下级分类 → 物种 → 个体
   整棵树保存在服务器 data/taxonomy.json，可自由增删改。
   每个实体带稳定 id；图片槽位由 id 派生，改名/排序不丢图。
   ========================================================= */

const RARITY_LABEL = { common:"普通", rare:"稀有", epic:"史诗", legend:"传说" };
const MODS = ["幼年","普通","黄金","白金","钻石","暗影","烈焰","冰霜","雷霆","疾风",
              "大地","星光","幻彩","机械","远古","守护","勇者","王者","传说","神话"];
const RARITY_OF = i => (i < 2 ? "common" : i < 6 ? "rare" : i < 12 ? "epic" : "legend");

/* 全局图鉴树（由 admin.js 的 loadTax() 加载/落盘） */
let TAX = [];

function uid(p){ return p + Math.random().toString(36).slice(2, 10); }
const varSlot = id => "var:" + id;     // 个体图
const spSlot  = id => "sp:" + id;      // 物种封面

/* 默认种子（首次启动、服务器无数据时写入） */
function defaultTaxonomy(){
  const CATEGORIES = [
    { key:"sky",   name:"天空飞船", icon:"🚀", subs:["savanna","desert","base","mountain","jungle"] },
    { key:"time",  name:"时空飞船", icon:"⏳", subs:["jurassic","olympus","garden","greatwall"] },
    { key:"ocean", name:"海洋",     icon:"🌊", subs:["ocean"] }
  ];
  const GROUPS = [
    { key:"savanna", cat:"sky", name:"草原", icon:"🌾", species:[
      "狮子","老虎","大象","斑马","长颈鹿","猎豹","犀牛","河马","羚羊","鬣狗",
      "疣猪","鸵鸟","角马","水牛","狐獴","土豚","狒狒","旋角羚","野马","貂羚" ]},
    { key:"desert", cat:"sky", name:"沙漠", icon:"🏜️", species:[
      "骆驼","耳廓狐","响尾蛇","走鹃","沙漠猫","跳鼠","秃鹫","沙蜥","鸸鹋","蝎子",
      "瞪羚","胡狼","獴","陆龟","角蝰","沙鼠","猎隼","狼蛛","犰狳","沙鸡" ]},
    { key:"base", cat:"sky", name:"基地", icon:"🏭", species:[
      "机械狮","机器犬","铁甲犀","钢羽鹰","堡垒象","齿轮熊","装甲豹","闪电狐","涡轮马","哨卫鸟",
      "钻地鼹","能量鹿","液压牛","机甲虎","飞行蚁","侦察蜂","护卫龙","工械狸","泵站龟","雷光羊" ]},
    { key:"mountain", cat:"sky", name:"山脉", icon:"⛰️", species:[
      "雪豹","山羊","棕熊","牦牛","金雕","旱獭","梅花鹿","麋鹿","灰狼","猞猁",
      "岩羊","雪兔","红狐","鼯鼠","盘羊","石貂","香獐","雪鸡","兀鹫","驼鹿" ]},
    { key:"jungle", cat:"sky", name:"丛林", icon:"🌴", species:[
      "黑豹","巨嘴鸟","猩猩","鳄鱼","鹦鹉","树懒","蜘蛛猴","蟒蛇","美洲虎","食蚁兽",
      "犀鸟","眼镜猴","蜜熊","貘","鬣蜥","蜂鸟","箭毒蛙","豹猫","长臂猿","翠鸟" ]},
    { key:"jurassic", cat:"time", name:"侏罗纪", icon:"🦖", species:[
      "霸王龙","三角龙","翼龙","迅猛龙","剑龙","梁龙","甲龙","副栉龙","棘龙","异特龙",
      "腕龙","角鼻龙","始祖鸟","沧龙","蛇颈龙","双冠龙","美颌龙","镰刀龙","无齿翼龙","雷龙" ]},
    { key:"olympus", cat:"time", name:"奥林匹斯", icon:"🏛️", species:[
      "天马","狮鹫","独角兽","地狱犬","凤凰","金鹿","神鹰","海妖蛇","神牛","月神鹿",
      "战狼","雷鸟","金羊","圣狮","神龟","信使隼","泉灵蛙","橄榄鸠","织网蛛","星尾蜥" ]},
    { key:"garden", cat:"time", name:"花园", icon:"🌷", species:[
      "蝴蝶","蜜蜂","瓢虫","蜗牛","螳螂","蜻蜓","刺猬","兔子","松鼠","田鼠",
      "青蛙","乌龟","变色龙","金丝雀","翠鸟","竹节虫","甲虫","蚕","萤火虫","蟋蟀" ]},
    { key:"greatwall", cat:"time", name:"长城", icon:"🧱", species:[
      "熊猫","仙鹤","锦鲤","麒麟","貔貅","祥龙","金鸡","玉兔","朱雀","玄武",
      "白虎","雪狐","獬豸","狻猊","金蟾","蝙蝠","灵猫","猕猴","穿山甲","赤鳞蛇" ]},
    { key:"ocean", cat:"ocean", name:"海洋", icon:"🌊", species:[
      "海豚","鲨鱼","鲸鱼","章鱼","海龟","水母","海马","螃蟹","龙虾","小丑鱼",
      "蝠鲼","海星","海豹","企鹅","乌贼","剑鱼","独角鲸","海獭","河豚","鳐鱼" ]}
  ];

  /* 无下级分类的分类（传奇动物 / VIP动物）：物种直接挂在分类下 */
  const FLAT = [
    { name:"传奇动物", icon:"🌟", species:["凤凰","麒麟","青龙","白虎","朱雀","玄武","貔貅"], mods:["幼年","稀有","史诗","传说","神话"] },
    { name:"VIP动物", icon:"💎", species:["黄金狮王","钻石猛虎","白金巨象","星耀长颈鹿","至尊犀牛","幻彩狐狸","雷霆苍鹰","冰霜灰狼","烈焰黑豹","暗影巨蟒","远古神龟","守护灵鹿"], mods:["普通","黄金","钻石","至尊"] }
  ];

  const builtSubs = CATEGORIES.map(cat => ({
    id: uid("cat_"), name: cat.name, icon: cat.icon,
    subs: cat.subs.map(subKey => {
      const g = GROUPS.find(x => x.key === subKey);
      return {
        id: uid("sub_"), name: g.name, icon: g.icon,
        species: g.species.map(spName => ({
          id: uid("sp_"), name: spName,
          variants: MODS.map((mod, i) => ({ id: uid("va_"), name: mod + "·" + spName, rarity: RARITY_OF(i) }))
        }))
      };
    })
  }));

  const builtFlat = FLAT.map(f => ({
    id: uid("cat_"), name: f.name, icon: f.icon, subs: [],
    species: f.species.map(spName => ({
      id: uid("sp_"), name: spName,
      variants: f.mods.map((mod, i) => ({ id: uid("va_"), name: mod + "·" + spName, rarity: RARITY_OF(i) }))
    }))
  }));

  return [ ...builtSubs, ...builtFlat ];
}

/* 统计 */
function taxCount(){
  let sp = 0, va = 0;
  TAX.forEach(c => {
    const subs = c.subs || [];
    const direct = c.species || [];
    subs.forEach(s => s.species.forEach(p => { sp++; va += p.variants.length; }));
    direct.forEach(p => { sp++; va += p.variants.length; });
  });
  return { cats: TAX.length, subs: TAX.reduce((n,c)=>n+(c.subs?c.subs.length:0),0), species: sp, variants: va };
}
