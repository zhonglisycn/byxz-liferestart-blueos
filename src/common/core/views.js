/**
 * 页面渲染数据组装（纯逻辑，不 import 任何平台接口，Node 可直接单测）
 *
 * 为什么单独一层：
 *   · 首页现在只有"有档 / 无档"两种形态（按钮文案与副标题随当前槽位变），
 *     档案页要拼收集度、最近结局与三个槽位卡（选中态 / 能否读取 / 删除按钮文案）；
 *     这些拼装只跟共享容器里的状态有关，抽出来就能在 Node 里断言，
 *     页面里只剩"取值 → 赋值"和跳转。
 *   · 槽位的"年龄 · 体系·境界"里，境界名来自 engine.js 的 PATHS 阶梯
 *     （engine.js 是纯 JS，阶梯是模块常量，不需要装配内容池）；
 *     档案页因此仍然不会把 400KB 内容打进自己的页面字节码。
 */
import { percent, barWidth, rankStyle, pathStyle } from './theme.js'
import { SLOT_IDS, SLOT_LABEL, isResumable, codexCount } from './save.js'
import { CODEX_TOTAL } from './stats.js'
import { realmName } from './engine.js'

/** 档案页收集度进度条的轨道宽度（px，与 .pbar 的样式保持一致） */
export const ARCHIVE_BAR_W = 376

/** 空档位提示（有档时这一行换成"年龄 · 体系·境界"） */
export const SLOT_EMPTY_SUB = '空档 · 点此选中'

/** 槽位副标题最多几个字符（超长截断，避免在固定高度的卡片里换行顶出格子） */
export const SLOT_SUB_MAX = 18

/** 截断长文案：超出 n 个字符就留 n-1 个加省略号（n<=0 时返回空串） */
export function clipText(s, n) {
  const t = String(s === undefined || s === null ? '' : s)
  const max = Math.round(Number(n) || 0)
  if (max <= 0) return ''
  return t.length > max ? (t.slice(0, max - 1) + '…') : t
}

/**
 * 槽位一行摘要：
 *   空档 → 「空档 · 点此选中」
 *   有档 → 「12岁 · 修仙·炼气一层」（没走体系就是「12岁 · 凡人」）
 */
export function slotLine(run) {
  if (!isResumable(run)) return SLOT_EMPTY_SUB
  const age = (run.age || 0) + '岁'
  if (!run.path) return clipText(age + ' · 凡人', SLOT_SUB_MAX)
  return clipText(age + ' · ' + pathStyle(run.path.kind).name + '·' + realmName(run), SLOT_SUB_MAX)
}

/**
 * 首页只需要两件事：主按钮是"继续人生"还是"重开人生"，以及副标题。
 * 三态（无档 / 有档 / 多槽）的差异都体现在这里：
 * 多槽时以**当前选中的槽**为准，选中空槽就是"重开人生"（那一槽没有可续的局）。
 * @param st { slots:{auto,s1,s2}, slot:'auto'|'s1'|'s2' }
 */
export function homeView(st) {
  const s = st || {}
  const slots = s.slots || {}
  const slot = s.slot || 'auto'
  const run = slots[slot] || null
  const canResume = isResumable(run)
  const slotName = SLOT_LABEL[slot] || SLOT_LABEL.auto
  return {
    canResume: canResume,
    slotName: slotName,
    age: canResume ? (run.age || 0) : 0,
    startText: canResume ? '继续人生' : '重开人生',
    startSub: canResume
      ? ('接着 ' + (run.age || 0) + ' 岁往下走 · ' + slotName)
      : '抽词条 → 分配属性 → 逐年推进'
  }
}

/**
 * 档案页：收集度 + 最近结局 + 三个存档槽。
 * @param st        { slots, slot, last, codexSeen }
 * @param confirmId 正在等待二次确认的槽位 id（'' 表示没有）
 * @returns 模板字段：got/denom/pct/barW/hasLast/last/slotCards
 *          slotCards 每项：{ id, label, sub, empty, sel, canRead, tag, confirming, delText, rKey, dKey }
 */
export function archiveView(st, confirmId) {
  const s = st || {}
  const slots = s.slots || {}
  const cur = s.slot || 'auto'

  // 收集度：与图鉴页同一口径（已得 = 词条 + 物品 + 结局 + 成就，体系不计入分母）
  const got = codexCount(s.codexSeen)
  const pct = percent(got, CODEX_TOTAL)

  // 最近一次结算（End 页写的小记录）；没有就由页面显示占位
  const last = s.last
  const hasLast = !!(last && last.name)
  const rs = rankStyle(hasLast ? last.rank : 1)

  const slotCards = []
  for (let i = 0; i < SLOT_IDS.length; i++) {
    const id = SLOT_IDS[i]
    const run = slots[id] || null
    const empty = !isResumable(run)
    const confirming = confirmId === id
    slotCards.push({
      id: id,
      label: SLOT_LABEL[id] || id,
      sub: slotLine(run),
      empty: empty,
      sel: id === cur,
      canRead: !empty,
      tag: id === cur ? '当前' : '',
      confirming: confirming,
      // 两段式删除：第一次点变文案，第二次点才真的删
      delText: confirming ? '确认删除' : '删除',
      rKey: 'r-' + id,   // 按压态用各自的 key，避免按一个亮两个
      dKey: 'd-' + id
    })
  }

  return {
    got: got,
    denom: CODEX_TOTAL,
    pct: pct,
    barW: barWidth(got, CODEX_TOTAL, ARCHIVE_BAR_W),
    hasLast: hasLast,
    last: {
      cls: rs.cls,
      letter: rs.letter,
      rankName: rs.name,
      line: hasLast
        ? (last.name + ' · 享年 ' + (last.age || 0) + ' 岁 · 评分 ' + (last.score || 0))
        : ''
    },
    slotCards: slotCards
  }
}
