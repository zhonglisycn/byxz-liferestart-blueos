/**
 * 存档纯逻辑（不 import 任何平台接口，Node 里可直接单测）
 *
 * app.js 负责把它接到 storage 上；这里只管"存什么、能不能存、坏了怎么办"。
 * 手环版这些逻辑散在 app.ux 里，没法单独测，移植时抽出来补上了单测。
 */

export function emptyCodex() {
  return { T: [], I: [], D: [], A: [], P: [] }
}

/* ------------------------------------------------------------------ */
/* 存档槽：2 个手动槽 + 1 个自动档                                      */
/*                                                                     */
/* 键名沿用原有前缀 lrgt_（自动档仍是 lrgt_run，老存档进应用就是自动档， */
/* 不会因为升级槽位丢掉正在玩的一局）。storage 的读写仍全部在 util.js    */
/* 里包 try/catch，这里只负责"键怎么算、坏档怎么办"。                    */
/* ------------------------------------------------------------------ */

export const SLOT_IDS = ['auto', 's1', 's2']

export const SLOT_LABEL = { auto: '自动档', s1: '存档一', s2: '存档二' }

/** 槽位 key → storage 键（非法槽位一律回退到自动档，不产生新前缀） */
export function slotKey(slot) {
  if (slot === 's1') return 'lrgt_slot1'
  if (slot === 's2') return 'lrgt_slot2'
  return 'lrgt_run'
}

export function isSlot(slot) {
  return SLOT_IDS.indexOf(slot) >= 0
}

/** 空槽位表（三个槽都是 null） */
export function emptySlots() {
  return { auto: null, s1: null, s2: null }
}

/**
 * 把三个槽文本读成 {auto,s1,s2} 的 run 表。
 * 坏数据当空槽——首页只显示"空"，绝不会被坏存档带崩。
 */
export function parseSlots(texts) {
  const out = emptySlots()
  const t = texts || {}
  for (let i = 0; i < SLOT_IDS.length; i++) {
    const id = SLOT_IDS[i]
    const r = parseRun(t[id])
    out[id] = isResumable(r) ? r : null
  }
  return out
}

/** 槽位摘要（首页卡片用）：空槽 vs 年龄/词条数/死因等一行文案 */
export function slotInfo(run) {
  if (!isResumable(run)) return { empty: true, age: 0, talents: 0 }
  return {
    empty: false,
    age: run.age || 0,
    talents: run.talents ? run.talents.length : 0,
    items: run.items ? run.items.length : 0,
    started: !!run.started
  }
}

/* ------------------------------------------------------------------ */
/* 最近一次结算：首页"最近结局"卡片                                      */
/*                                                                     */
/* 首页不 import 内容池（否则 400KB 内容会内联进首页字节码），所以结局名   */
/* /评级在结算页写成一个几十字节的小记录，首页只读它。                     */
/* ------------------------------------------------------------------ */

export function emptyLast() {
  return { name: '', rank: 1, score: 0, age: 0, path: '', talents: 0, items: 0 }
}

export function serializeLast(rec) {
  if (!rec || !rec.name) return null
  try {
    const text = JSON.stringify({
      name: String(rec.name),
      rank: Math.min(5, Math.max(1, Math.round(Number(rec.rank) || 1))),
      score: Math.max(0, Math.round(Number(rec.score) || 0)),
      age: Math.max(0, Math.round(Number(rec.age) || 0)),
      path: String(rec.path || ''),
      talents: Math.max(0, Math.round(Number(rec.talents) || 0)),
      items: Math.max(0, Math.round(Number(rec.items) || 0))
    })
    return text.length > 2 ? text : null
  } catch (e) {
    return null
  }
}

export function parseLast(text) {
  if (!text) return null
  try {
    const o = JSON.parse(String(text))
    if (!o || typeof o !== 'object' || !o.name) return null
    return {
      name: String(o.name),
      rank: Math.min(5, Math.max(1, Math.round(Number(o.rank) || 1))),
      score: Math.max(0, Math.round(Number(o.score) || 0)),
      age: Math.max(0, Math.round(Number(o.age) || 0)),
      path: String(o.path || ''),
      talents: Math.max(0, Math.round(Number(o.talents) || 0)),
      items: Math.max(0, Math.round(Number(o.items) || 0))
    }
  } catch (e) {
    return null
  }
}

/**
 * 一局要不要写存档：
 *  - 没开始（还在抽词条/分配属性）不存；
 *  - 已经死了不存——否则首页会出现一局"死人"可以继续玩。
 * 返回要写入的 JSON 文本；不该存时返回 null。
 */
export function serializeRun(run) {
  if (!run || !run.started || !run.alive) return null
  try {
    const text = JSON.stringify(run)
    return typeof text === 'string' && text.length > 2 ? text : null
  } catch (e) {
    return null
  }
}

/** 读存档：坏数据/空数据一律返回 null（当没有存档，不能把首页带崩） */
export function parseRun(text) {
  if (!text) return null
  try {
    const run = JSON.parse(String(text))
    if (!run || typeof run !== 'object') return null
    if (!Array.isArray(run.log)) run.log = []
    return run
  } catch (e) {
    return null
  }
}

/** 首页判断能否"继续人生" */
export function isResumable(run) {
  return !!(run && run.started && run.alive)
}

/** 读图鉴存档：结构不对就当空（老存档缺 P 键要补上） */
export function parseCodex(text) {
  if (!text) return emptyCodex()
  try {
    const o = JSON.parse(String(text))
    if (!o || !Array.isArray(o.T)) return emptyCodex()
    if (!Array.isArray(o.P)) o.P = []
    if (!Array.isArray(o.I)) o.I = []
    if (!Array.isArray(o.D)) o.D = []
    if (!Array.isArray(o.A)) o.A = []
    return o
  } catch (e) {
    return emptyCodex()
  }
}

/**
 * 把一局里见过的词条/物品/结局/成就/体系并进图鉴（就地去重，返回同一个对象）
 * @param codex 现有图鉴
 * @param hit { pathKinds:[], talents:[], items:[], ending:'', achievements:[] }
 */
export function mergeCodex(codex, hit) {
  const c = codex && Array.isArray(codex.T) ? codex : emptyCodex()
  if (!Array.isArray(c.P)) c.P = []
  const add = (k, id) => { if (id && c[k].indexOf(id) < 0) c[k].push(id) }
  const h = hit || {}
  const paths = h.pathKinds || []
  const talents = h.talents || []
  const items = h.items || []
  const achs = h.achievements || []
  for (let i = 0; i < paths.length; i++) add('P', paths[i])
  for (let i = 0; i < talents.length; i++) add('T', talents[i])
  for (let i = 0; i < items.length; i++) add('I', items[i])
  for (let i = 0; i < achs.length; i++) add('A', achs[i])
  add('D', h.ending)
  return c
}

/** 图鉴已收集条数（不含体系，与首页"已收集 N / M 条"口径一致） */
export function codexCount(codex) {
  const c = codex || emptyCodex()
  return (c.T ? c.T.length : 0) + (c.I ? c.I.length : 0) +
    (c.D ? c.D.length : 0) + (c.A ? c.A.length : 0)
}
