/**
 * 打包前预生成（从内容池）：
 *   1) src/common/core/stats.js        —— 只有数字，几十字节（首页/关于页用）
 *   2) src/common/core/codex-index.js  —— 图鉴索引：每条内容的"已解锁文案"预拼好，
 *      图鉴页不再 import 内容池、不再进页时遍历/格式化上千条
 *
 * 内容改过之后跑一次：node tools/gen-stats.mjs
 * tools/core.test.mjs 里有测试核对两个文件与真实内容池一致（防漂移），忘了跑会红。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentUrl = pathToFileURL(path.join(ROOT, 'src/common/core/content/index.js')).href
const engineUrl = pathToFileURL(path.join(ROOT, 'src/common/core/engine.js')).href
const buildUrl = pathToFileURL(path.join(ROOT, 'src/common/core/codex-build.js')).href
const { buildContent } = await import(contentUrl)
const engine = await import(engineUrl)
const { buildCodexIndex, SEP } = await import(buildUrl)
const c = buildContent()
// 必须先注入内容池：effText 里的"获得法宝·xxx"要查 ITEM_MAP，
// 不注入的话索引里会退化成"获得物品"，与页面运行时显示不一致（测试会拦）
engine.setContent(c)

const stats = {
  talents: c.talents.length,
  events: c.events.length,
  items: c.items.length,
  endings: c.endings.length,
  achievements: c.achievements.length,
  paths: 4
}
const codexTotal = stats.talents + stats.items + stats.endings + stats.achievements

const out = `/**
 * 内容规模统计——由 tools/gen-stats.mjs 从 content/ 生成，不要手改。
 * 内容有增减时重新生成：node tools/gen-stats.mjs
 * tools/core.test.mjs 会核对本文件与内容池是否一致（防漂移）。
 */
export const STATS = {
  talents: ${stats.talents},
  events: ${stats.events},
  items: ${stats.items},
  endings: ${stats.endings},
  achievements: ${stats.achievements},
  paths: ${stats.paths}
}

/** 图鉴总数（体系 P 是四条走的体系，不计入"收集 N / M 条"的分母，与手环版口径一致） */
export const CODEX_TOTAL = ${codexTotal}
`

fs.writeFileSync(path.join(ROOT, 'src/common/core/stats.js'), out)

// ---- 图鉴索引 ----
const index = buildCodexIndex(c)
const KEYS = ['P', 'T', 'E', 'I', 'D', 'A']
const lines = []
for (let k = 0; k < KEYS.length; k++) {
  const key = KEYS[k]
  const rows = index.rows[key] || []
  lines.push('  ' + key + ': [')
  for (let i = 0; i < rows.length; i++) {
    lines.push('    ' + JSON.stringify(rows[i]) + (i === rows.length - 1 ? '' : ','))
  }
  lines.push('  ]' + (k === KEYS.length - 1 ? '' : ','))
}
const idxOut = `/**
 * 图鉴索引——由 tools/gen-stats.mjs 从 content/ 预生成，不要手改。
 * 重新生成：node tools/gen-stats.mjs
 *
 * 一行 = 一条内容的"已解锁文案"，字段用 \\u0001 分隔（见 codex-build.js）：
 *   T/I/D/A/E：id ␁ 显示名 ␁ 说明 ␁ 原文 ␁ 颜色类
 *   P        ：key ␁ 名称 ␁ 说明 ␁ 阶梯
 * 图鉴页只 import 本文件（不再把 400KB 内容池打进自己的页面字节码），
 * 进页只把当前页那十几行按分隔符拆开，不遍历、不排序、不拼字符串。
 * tools/core.test.mjs 会重新生成一遍并与本文件逐行比对（防漂移）。
 */
export const CODEX_SEP = '\\u0001'

export const CODEX_ROWS = {
${lines.join('\n')}
}
`
fs.writeFileSync(path.join(ROOT, 'src/common/core/codex-index.js'), idxOut)

const kb = (n) => Math.round(n / 1024) + 'KB'
console.log('已生成 src/common/core/stats.js: ' + JSON.stringify(stats) + ' 图鉴分母 ' + codexTotal)
console.log('已生成 src/common/core/codex-index.js: ' + kb(idxOut.length) +
  '，共 ' + Object.keys(index.rows).map((k) => k + ':' + index.rows[k].length).join(' '))
if (SEP.length !== 1) throw new Error('分隔符必须是单字符，否则行拆分逻辑要跟着改')
