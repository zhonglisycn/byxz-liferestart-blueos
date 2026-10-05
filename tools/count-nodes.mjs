/**
 * 文本节点体检（性能口径，不进打包）
 *
 * 方屏上一屏的文本节点数直接影响首帧与重排成本（"单页 ≤60"是上一轮定下的口径）。
 * 这里静态数一遍每个页面模板里的 <text>：静态节点 + for 循环按最坏条数展开，
 * 超过 60 就红，提醒别在一页里堆太多行。
 *
 * 用法：node tools/count-nodes.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src/pages')

/** 各页面 for 循环的最坏展开条数（与页面里的常量保持一致） */
const WORST = {
  'Codex/index.ux': { pageList: 14, tabs: 6, filters: 3 },
  'Life/index.ux': { logs: 14, 'cur.changes': 4, talentLines: 6, itemLines: 6 },
  'Talents/index.ux': { rows: 5 },
  'Alloc/index.ux': { rows: 4 },
  'End/index.ux': { tags: 4, factRows: 2, talents: 3, items: 4, achs: 4 },
  'Archive/index.ux': { slotCards: 3 }
}

/**
 * 互斥视图：同一时刻只会渲染其中一组（例如 Life 页的"历程视图"和"词条/物品视图"，
 * 由 info 开关切换）。这一组按"取最大值"而不是求和。
 */
const VIEWS = {
  'Life/index.ux': [['logs', 'cur.changes'], ['talentLines', 'itemLines']]
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ux')) out.push(p)
  }
  return out
}

/** 用 <div> 配对扫描，返回 [{expr, body}] 的 for 块列表（含嵌套） */
function forBlocks(tpl) {
  const tagRe = /<div\b[^>]*>|<\/div>/g
  const stack = []
  const blocks = []
  let m
  while ((m = tagRe.exec(tpl))) {
    if (m[0] === '</div>') {
      const start = stack.pop()
      if (start === undefined) continue
      const openTag = tpl.slice(start, tpl.indexOf('>', start) + 1)
      const fm = openTag.match(/for="\{\{\s*([^}\s]+)\s*\}\}"/)
      if (fm) blocks.push({ expr: fm[1], from: tpl.indexOf('>', start) + 1, to: m.index })
    } else {
      stack.push(m.index)
    }
  }
  return blocks
}

function countText(s) { return (s.match(/<text\b/g) || []).length }

let worst = 0
let worstFile = ''
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join('/')
  const text = fs.readFileSync(file, 'utf8')
  const tpl = text.slice(text.indexOf('<template>'), text.indexOf('</template>'))

  const blocks = forBlocks(tpl)
  const views = VIEWS[rel] || []
  const inView = (expr) => views.some(v => v.indexOf(expr) >= 0)
  // 最外层 for 块（被别的 for 包住的嵌套块不再重复计：模板实际只写一次）
  const mask = new Array(tpl.length).fill(false)
  let loopNodes = 0
  const used = []
  const viewSums = views.map(() => 0)
  for (const b of blocks) {
    if (mask[b.from]) continue // 已在更外层 for 体内
    const worstCase = (WORST[rel] && WORST[rel][b.expr] !== undefined) ? WORST[rel][b.expr] : 1
    const body = tpl.slice(b.from, b.to)
    for (let i = b.from; i < b.to; i++) mask[i] = true
    used.push({ expr: b.expr, n: worstCase, texts: countText(body) })
    const val = countText(body) * worstCase
    if (inView(b.expr)) {
      for (let vi = 0; vi < views.length; vi++) {
        if (views[vi].indexOf(b.expr) >= 0) viewSums[vi] += val
      }
    } else {
      loopNodes += val
    }
  }
  // 把 for 体挖掉，剩下的就是静态文本节点
  const rest = mask.map((m, i) => (m ? ' ' : tpl[i])).join('')
  const staticNodes = countText(rest)
  if (viewSums.length) loopNodes += Math.max.apply(null, viewSums)
  const sum = staticNodes + loopNodes
  if (sum > worst) { worst = sum; worstFile = rel }
  const detail = used.map(u => u.expr + '×' + u.n).join(' ')
  console.log(rel.padEnd(18) + '文本节点(最坏) ≈ ' + String(sum).padStart(3) +
    '  静态 ' + staticNodes + (detail ? '  循环 ' + detail : '') +
    (viewSums.length ? '  视图取大 ' + viewSums.join('/') : '') + (sum > 60 ? '   ← 超过 60' : ''))
}
console.log('\n最坏一页：' + worstFile + ' ≈ ' + worst + ' 个文本节点（目标 ≤60）')
if (worst > 60) process.exit(1)
