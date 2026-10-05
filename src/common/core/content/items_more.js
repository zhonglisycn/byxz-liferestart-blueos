/**
 * 人生重开 · 修仙（vivo WATCH GT 2 移植版）
 * 内容扩充包 · 物品（第三批）
 *
 * id 段：I101 ~ I110（10 条）
 * 稀有度沿用 1 凡品 / 2 灵品 / 3 仙品 / 4 神品；kind 沿用 法宝 / 丹药 / 灵物 / 功法。
 * 物品系统是"持有即生效"（eff 在获得时结算），所以每条都按现有 schema 给纯加成 + 取舍。
 * 其中 I101 / I104 / I105 / I108 / I109 / I110 由新增人生事件触发（见 events_more.js）。
 */
export const ITEMS = [
  { id: 'I101', name: '养生保温杯', kind: '灵物', rarity: 1, desc: '枸杞泡到发白，杯壁上有一圈茶渍', eff: { hp: 1, lifespan: 8 } },
  { id: 'I102', name: '工位绿萝', kind: '灵物', rarity: 1, desc: '加班越久它长得越旺，你怀疑它在吸你的命', eff: { hp: 1, eq: 1 } },
  { id: 'I103', name: '地铁月票', kind: '法宝', rarity: 1, desc: '边角磨圆了，见证过你所有的早高峰', eff: { luck: 1, hp: 1 } },
  { id: 'I104', name: '旧口琴', kind: '法宝', rarity: 2, desc: '吹起来跑调，但夜里吹两句，心里就静了', eff: { eq: 2, luck: 1, iq: -1 } },
  { id: 'I105', name: '二手跑鞋', kind: '法宝', rarity: 1, desc: '鞋底快磨平了，腿脚倒是越跑越硬', eff: { hp: 2, eq: -1 } },
  { id: 'I106', name: '黑眼圈眼罩', kind: '灵物', rarity: 2, desc: '挡住一夜没睡的真相，也挡住所有寒暄', eff: { hp: 2, iq: 1, eq: -1 } },
  { id: 'I107', name: '师兄的笔记', kind: '功法', rarity: 2, desc: '字迹潦草，但每一页的页脚都写着重点', eff: { progress: 60, iq: 1 } },
  { id: 'I108', name: '本命灵灯', kind: '法宝', rarity: 3, desc: '灯芯自己会亮；灯还亮着，就还有一口气要撑', eff: { progressRate: 0.4, lifespan: 60, hp: 1 } },
  { id: 'I109', name: '量子算盘', kind: '法宝', rarity: 3, desc: '拨一下，答案直接出现在你脑子里，过程没人看得懂', eff: { iq: 3, progress: 80, eq: -1 } },
  { id: 'I110', name: '还魂哨', kind: '法宝', rarity: 4, desc: '说是阎王账本上的橡皮擦，吹响的人至今没有回来对质', eff: { hp: 4, lifespan: 150, luck: 2 } }
]
