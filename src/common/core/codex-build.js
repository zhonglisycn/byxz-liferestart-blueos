/**
 * 图鉴索引生成（纯逻辑，Node 可单测）
 *
 * 图鉴要展示 2000+ 条内容的"已解锁文案"。这些文案（效果/条件/阶梯）以前是进页时
 * 用 effText/reqText 现拼的：光打开事件分类就要对 1065 条逐条拼字符串，方屏上
 * 这一下就是可见的卡顿。现在改成打包前预生成（tools/gen-stats.mjs 调用本模块），
 * 运行时只把**当前页那 14 条**按分隔符拆开——不排序、不去重、不拼大数组。
 *
 * 行格式（用 \u0001 分隔，省掉一堆重复的键名）：
 *   T/I/D/A/E：id ␁ 已解锁显示名 ␁ 说明 ␁ 备注（原文） ␁ 颜色类
 *   P        ：key ␁ 名称 ␁ 说明 ␁ 阶梯
 * 未解锁的显示（？？？/尚未解锁）是常量，不占索引体积。
 */
import { RARITY_NAME, PATH_LIST, effText, reqText } from './engine.js'
import { eventToneCls, eventToneName, rarityCls } from './theme.js'

export const SEP = '\u0001'

/** 事件年龄段的显示（与旧图鉴页一致） */
function ageText(e) {
  return e.age ? (e.age[0] + '-' + e.age[1] + ' 岁') : ''
}

function rowOf(fields) {
  for (let i = 0; i < fields.length; i++) {
    const v = String(fields[i] === undefined || fields[i] === null ? '' : fields[i])
    if (v.indexOf(SEP) >= 0) throw new Error('内容字段里出现了分隔符，索引格式需要换分隔符')
    fields[i] = v
  }
  return fields.join(SEP)
}

export function buildCodexIndex(content) {
  const c = content || {}
  const rows = { T: [], I: [], D: [], A: [], E: [], P: [] }

  // 词条：名字（稀有度）｜效果｜原文
  const talents = c.talents || []
  for (let i = 0; i < talents.length; i++) {
    const e = talents[i]
    const rarity = e.rarity || 1
    rows.T.push(rowOf([
      e.id,
      e.name + '（' + RARITY_NAME[rarity] + '）',
      '效果：' + (effText(e.eff) || '无属性变化'),
      e.desc || '',
      rarityCls(rarity)
    ]))
  }

  // 物品：类别·名字｜效果｜原文
  const items = c.items || []
  for (let i = 0; i < items.length; i++) {
    const e = items[i]
    const rarity = e.rarity || 1
    rows.I.push(rowOf([
      e.id,
      (e.kind ? e.kind + '·' : '') + e.name,
      '效果：' + (effText(e.eff) || '无'),
      e.desc || '',
      'r' + rarity
    ]))
  }

  // 结局 / 成就：名字（品级）｜触发条件｜原文
  const endings = c.endings || []
  for (let i = 0; i < endings.length; i++) {
    const e = endings[i]
    const rarity = e.rarity || e.rank || 1
    rows.D.push(rowOf([
      e.id,
      e.name + (e.rank ? '（' + RARITY_NAME[e.rank] + '）' : ''),
      '条件：' + reqText(e.req),
      e.desc || '',
      'r' + rarity
    ]))
  }
  const achs = c.achievements || []
  for (let i = 0; i < achs.length; i++) {
    const e = achs[i]
    const rarity = e.rarity || e.rank || 1
    rows.A.push(rowOf([
      e.id,
      e.name + (e.rank ? '（' + RARITY_NAME[e.rank] + '）' : ''),
      '条件：' + reqText(e.req),
      e.desc || '',
      'r' + rarity
    ]))
  }

  // 事件：标题（年龄段 · 类型）｜条件 ｜ 效果｜正文｜类型配色 class
  // 事件恒为"已解锁"，颜色类让位给"类型配色"（机遇/危机/奇遇/体系/劫难），
  // 图鉴里一眼能分清这条是走运还是倒霉。
  const events = c.events || []
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const age = ageText(e)
    rows.E.push(rowOf([
      e.id,
      (e.title || '日常') + (age ? '　' + age : '') + ' · ' + eventToneName(e.kind),
      '条件：' + reqText(e.req) + ' ｜ 效果：' + (effText(e.eff) || '无属性变化'),
      e.text || '',
      eventToneCls(e.kind)
    ]))
  }

  // 体系：四条（走过/没走过两种显示，这里只存走过时的文案）
  for (let i = 0; i < PATH_LIST.length; i++) {
    const d = PATH_LIST[i]
    rows.P.push(rowOf([
      d.key,
      d.name,
      '灵根 ' + d.root + ' ｜ 资源 ' + d.res + ' ｜ 本命 ' + d.sp,
      d.ladder.map(function (x) { return x.name }).join(' → ')
    ]))
  }

  return {
    rows: rows,
    counts: {
      T: talents.length,
      I: items.length,
      D: endings.length,
      A: achs.length,
      E: events.length,
      P: PATH_LIST.length
    }
  }
}
