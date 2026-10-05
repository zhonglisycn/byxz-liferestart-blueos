/**
 * 内容扩充包 · 天赋词条（第三批）
 * 见 docs/内容规范.md 第 1 节
 *
 * 稀有度：1 凡品 / 2 灵品 / 3 仙品 / 4 神品
 * tag：智慧 / 体质 / 社交 / 幸运 / 修仙 / 诡异
 * id 段：T621 ~ T635（15 条；T599~T620 已被前批占用，从 T621 接着排）
 *
 * 设计口径与现有词条一致：凡品有小取舍，灵品是"一项突出 + 一项代价"，
 * 仙品/神品的加成明显但都带负面，没有纯赚的条目。
 * flag 供人生事件 req.flags 联动（late_bloomer / family_craft / sword_bone）。
 */
export const TALENTS = [
  /* ---------------- 凡品（1） 6 条 ---------------- */
  { id: 'T621', name: '字丑', rarity: 1, tag: '智慧', desc: '一手字像鸡爪刨的，医生都认不出你的签名', eff: { iq: 1, eq: -1 } },
  { id: 'T622', name: '省电模式', rarity: 1, tag: '社交', desc: '一天只回三条消息，其余装死', eff: { eq: -1, hp: 1 } },
  { id: 'T623', name: '天生苦相', rarity: 1, tag: '社交', desc: '不笑的时候像在生气，其实只是发呆', eff: { eq: -1, luck: 1 } },
  { id: 'T624', name: '闻香识菜', rarity: 1, tag: '体质', desc: '隔着一条街能闻出谁家在炒肉', eff: { hp: 1, iq: -1 } },
  { id: 'T625', name: '铁打的腰', rarity: 1, tag: '体质', desc: '搬一天砖不喊累，坐下就起不来', eff: { hp: 2, iq: -1 } },
  { id: 'T626', name: '数字盲', rarity: 1, tag: '智慧', desc: '看着账单就觉得是世界未解之谜', eff: { iq: -1, luck: 1 } },

  /* ---------------- 灵品（2） 5 条 ---------------- */
  { id: 'T627', name: '人形闹钟', rarity: 2, tag: '体质', desc: '到点就饿，误差不超过三分钟', eff: { hp: 1, eq: 1, iq: -1 } },
  { id: 'T628', name: '记账鬼才', rarity: 2, tag: '智慧', desc: '每笔钱花在哪儿都记得清清楚楚', eff: { iq: 1, luck: 1, eq: -1 } },
  { id: 'T629', name: '一眼记住', rarity: 2, tag: '智慧', desc: '看一遍就能背，可惜只记三天', eff: { iq: 2, hp: -1 } },
  { id: 'T630', name: '大器晚成命', rarity: 2, tag: '幸运', desc: '前半生平平无奇，后半生才开始发力', eff: { lifespan: 30, iq: -1, flag: 'late_bloomer' } },
  { id: 'T631', name: '祖传手艺', rarity: 2, tag: '体质', desc: '家里三代都靠这双手吃饭', eff: { iq: 1, hp: 1, luck: -1, flag: 'family_craft' } },

  /* ---------------- 仙品（3） 3 条 ---------------- */
  { id: 'T632', name: '半步先机', rarity: 3, tag: '幸运', desc: '总能比麻烦早半步反应，代价是没人跟得上你', eff: { luck: 2, breakthrough: 0.04, eq: -1 } },
  { id: 'T633', name: '闭口禅', rarity: 3, tag: '智慧', desc: '一开口就破功，索性把话都咽回去', eff: { iq: 3, eq: -2 } },
  { id: 'T634', name: '剑骨天生', rarity: 3, tag: '修仙', desc: '骨头里像藏着一把没出鞘的剑，阴雨天隐隐作痛', eff: { hp: 2, breakthrough: 0.06, luck: -1, flag: 'sword_bone' } },

  /* ---------------- 神品（4） 1 条 ---------------- */
  { id: 'T635', name: '一念千年', rarity: 4, tag: '修仙', desc: '打坐一炷香，睁眼世上已过三天，寿元也跟着烧', eff: { progressRate: 0.5, iq: 2, lifespan: -40 } }
]
