/**
 * 内容规模统计——由 tools/gen-stats.mjs 从 content/ 生成，不要手改。
 * 内容有增减时重新生成：node tools/gen-stats.mjs
 * tools/core.test.mjs 会核对本文件与内容池是否一致（防漂移）。
 */
export const STATS = {
  talents: 664,
  events: 1110,
  items: 220,
  endings: 160,
  achievements: 180,
  paths: 4
}

/** 图鉴总数（体系 P 是四条走的体系，不计入"收集 N / M 条"的分母，与手环版口径一致） */
export const CODEX_TOTAL = 1224
