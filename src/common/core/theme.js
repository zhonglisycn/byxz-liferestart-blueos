/**
 * 表现层映射表（纯逻辑，不 import 任何平台接口，Node 可直接单测）
 *
 * 这一轮"内容丰富 + 表现力提升"新增的所有配色 / 稀有度 / 评级 / 事件类型映射
 * 都集中在这里：页面只按 key 取 class 名，颜色写在各自 <style> 里（每个页面
 * 独立打包，样式也得跟着页面走）。不把色值散落在页面脚本里，改配色只改一处。
 *
 * 约定：
 *   · 稀有度 1 凡品(灰) / 2 灵品(蓝) / 3 仙品(紫) / 4 神品(金) / 5 传说(金)
 *   · 事件四类：机遇(绿) / 危机(橙红) / 奇遇(蓝) / 体系(紫)
 *   · 评级五档：D 平凡(灰) / C 优秀(绿) / B 稀有(蓝) / A 史诗(紫) / S 传说(金)
 */

/* ---------------- 稀有度 ---------------- */

export const RARITY_NAME = ['', '凡品', '灵品', '仙品', '神品', '传说']

/** 稀有度 → 颜色 class（各页面 .r1~.r5 的样式必须与之对应） */
export function rarityCls(r) {
  const n = Math.round(Number(r) || 1)
  return 'r' + Math.min(5, Math.max(1, n))
}

export function rarityName(r) {
  const n = Math.round(Number(r) || 1)
  return RARITY_NAME[Math.min(5, Math.max(1, n))] || RARITY_NAME[1]
}

/* ---------------- 事件类型 ---------------- */

/**
 * 引擎日志里的 kind → 事件卡配色与标签。
 * life=机遇 / danger=危机 / item=奇遇 / cultivate·path·trial=体系事件。
 * 未知 kind 一律按"机遇"处理（不炸、不空白）。
 */
export const EVENT_TONES = [
  { key: 'life', cls: 'k-life', name: '机遇', color: '#6fcf97' },
  { key: 'danger', cls: 'k-danger', name: '危机', color: '#ff8a65' },
  { key: 'item', cls: 'k-fate', name: '奇遇', color: '#7fb3ff' },
  { key: 'cultivate', cls: 'k-path', name: '体系', color: '#bb86fc' },
  { key: 'path', cls: 'k-path', name: '体系', color: '#bb86fc' },
  { key: 'trial', cls: 'k-trial', name: '劫难', color: '#ffc857' }
]

export function eventTone(kind) {
  for (let i = 0; i < EVENT_TONES.length; i++) {
    if (EVENT_TONES[i].key === kind) return EVENT_TONES[i]
  }
  return EVENT_TONES[0]
}

/** 事件标签的短名（图鉴事件分类用同一个映射） */
export function eventToneName(kind) {
  return eventTone(kind).name
}

export function eventToneCls(kind) {
  return eventTone(kind).cls
}

/* ---------------- 评级 ---------------- */

/** 评级 → 大字评级字母与配色 class */
export const RANK_STYLE = {
  1: { letter: 'D', name: '平凡', cls: 'rk1' },
  2: { letter: 'C', name: '优秀', cls: 'rk2' },
  3: { letter: 'B', name: '稀有', cls: 'rk3' },
  4: { letter: 'A', name: '史诗', cls: 'rk4' },
  5: { letter: 'S', name: '传说', cls: 'rk5' }
}

export function rankStyle(rank) {
  const n = Math.round(Number(rank) || 1)
  return RANK_STYLE[Math.min(5, Math.max(1, n))] || RANK_STYLE[1]
}

/* ---------------- 四条体系 ---------------- */

export const PATH_STYLE = {
  cultivate: { name: '修仙', cls: 'p-cultivate', color: '#bb86fc' },
  body: { name: '炼体', cls: 'p-body', color: '#ff8a65' },
  magic: { name: '魔法', cls: 'p-magic', color: '#7fb3ff' },
  tech: { name: '科技', cls: 'p-tech', color: '#6fcf97' }
}

export function pathStyle(kind) {
  return PATH_STYLE[kind] || { name: '凡人', cls: 'p-none', color: '#8b8f96' }
}

/** 事件/结局 req 里的体系 key → 中文名（认不出就返回空串，不显示） */
export function pathName(kind) {
  const s = PATH_STYLE[kind]
  return s ? s.name : ''
}

/* ---------------- 四属性 ---------------- */

export const ATTR_UI = {
  iq: { name: '智力', short: '智', cls: 'a-iq', color: '#7fb3ff' },
  eq: { name: '情商', short: '情', cls: 'a-eq', color: '#ff9ecd' },
  hp: { name: '体质', short: '体', cls: 'a-hp', color: '#6fcf97' },
  luck: { name: '幸运', short: '运', cls: 'a-luck', color: '#ffc857' }
}

export function attrUI(key) {
  return ATTR_UI[key] || { name: key || '', short: '', cls: 'a-none', color: '#8b8f96' }
}

/* ---------------- 属性变化高亮 ---------------- */

/** 变化串里的正负号 → 颜色 class：+绿 −红，其它（获得物品/大难不死）走中性金 */
export function deltaCls(text) {
  const s = String(text === undefined || text === null ? '' : text)
  if (/[+＋]\d/.test(s)) return 'd-up'
  if (/[-−]\d/.test(s)) return 'd-down'
  return 'd-flat'
}

/**
 * 把引擎日志的 changes 数组拆成 [{text, cls}] 供模板逐条渲染。
 * 传入非数组时返回空数组（调用方显示占位）。
 */
export function splitChanges(changes) {
  if (!Array.isArray(changes)) return []
  const out = []
  for (let i = 0; i < changes.length; i++) {
    const t = String(changes[i] === undefined || changes[i] === null ? '' : changes[i])
    if (!t) continue
    out.push({ text: t, cls: deltaCls(t) })
  }
  return out
}

/* ---------------- 进度 / 三点指示 ---------------- */

/** 百分比（0~100 的整数；total<=0 时返回 0，不产生 NaN） */
export function percent(got, total) {
  const t = Number(total) || 0
  if (t <= 0) return 0
  const p = Math.round((Number(got) || 0) * 100 / t)
  return Math.min(100, Math.max(0, p))
}

/** 进度条填充宽度（px，至少 0，最多 width） */
export function barWidth(got, total, width) {
  const w = Number(width) || 0
  const p = percent(got, total)
  return Math.round(w * p / 100)
}

/** 「进行中」三点指示：0→·  1→··  2→···（只做 if 切换，不用动画 API） */
export const DOTS = ['·', '··', '···']

export function dotsAt(i) {
  const n = Math.abs(Math.round(Number(i) || 0)) % DOTS.length
  return DOTS[n]
}
