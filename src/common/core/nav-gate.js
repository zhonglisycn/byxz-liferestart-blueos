/**
 * 导航闸门（纯逻辑，Node 可单测）
 *
 * 模拟器实测的退出路径：页面切换期间同一个按钮又收到一次点击（慢页面上很常见），
 * onNext 里的 router.replace 被连着调了多次，第二次会打在"正在创建的同名页面"上
 * （日志：RouterUtils "page is not nullptr"），随后该页一直不可见
 * （"skip change page visible: visible 0"），应用退出。
 *
 * 这里给"跳转"加一道单次闸门：
 *   · 同一个目标在 NAV_GAP 毫秒内重复请求 → 丢弃（点两下只跳一次）
 *   · 与上一次跳转间隔小于 NAV_MIN 毫秒的**任何**跳转 → 丢弃（一拍里不可能连跳两页）
 * 页面切换本身要几百毫秒，被丢掉的都是重复请求，不会影响正常操作。
 */

export const NAV_GAP = 700  // 同一目标的重复窗口
export const NAV_MIN = 150  // 不同目标的过渡窗口

/**
 * @param gate 闸门状态对象（同一页面模块里传同一个引用即可）
 * @param key  目标标识（页面 uri，或 'back'）
 * @param now  当前时间戳（毫秒）
 * @returns 是否放行
 */
export function allowNav(gate, key, now) {
  const g = gate || {}
  const at = typeof g.at === 'number' ? g.at : 0
  const dt = now - at
  if (at > 0) {
    if (g.key === key && dt < NAV_GAP) return false
    if (dt < NAV_MIN) return false
  }
  g.key = key
  g.at = now
  return true
}
