/**
 * 属性分配辅助（纯逻辑，Node 可单测）
 *
 * 分配属性页新增的"随机分配 / 重置"两个按钮用这里：
 *   · 引擎的 alloc() 要求四属性之和**正好**等于 TOTAL_POINTS，所以随机结果
 *     必须自己保证守恒，不能把 19 或 21 点丢给引擎；
 *   · 随机数由调用方注入（页面传 Math.random），测试里传固定序列，
 *     保证同一个种子下结果可复现。
 */

/** 全部清空（重置） */
export function zeroAll(attrs, keys) {
  const out = {}
  const ks = keys || []
  for (let i = 0; i < ks.length; i++) out[ks[i]] = 0
  return out
}

/**
 * 把 total 点随机分配到 keys 上（每点一次随机，和"一只手一发"的手感一致）。
 * rand 缺省用 Math.random；返回的每个值都是非负整数，和恒为 total。
 */
export function randomAlloc(total, keys, rand) {
  const r = typeof rand === 'function' ? rand : Math.random
  const ks = keys || []
  const out = zeroAll({}, ks)
  const n = Math.max(0, Math.round(Number(total) || 0))
  if (!ks.length) return out
  for (let i = 0; i < n; i++) {
    const i2 = Math.min(ks.length - 1, Math.max(0, Math.floor(r() * ks.length)))
    out[ks[i2]]++
  }
  return out
}

/** 某一项占满 total 时进度条的比例（0~1），用于条宽计算 */
export function attrRatio(v, total) {
  const t = Number(total) || 0
  if (t <= 0) return 0
  const x = Number(v) || 0
  return Math.min(1, Math.max(0, x / t))
}
