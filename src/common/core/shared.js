/**
 * 跨页共享状态容器（纯逻辑，不 import 平台接口，Node 可单测）
 *
 * 为什么需要它——模拟器实测（2026-10-05）：
 * 蓝河的打包器是"每个页面一份 bundle"，公共模块会被**内联进每个页面的字节码**，
 * 页面各自执行一份。于是"模块级单例"在页与页之间根本不是一个对象：
 *   Talents 页 app.setRun(run) 写的是 Talents 那一份；
 *   Alloc   页 onInit 里读到的 app.run 永远是 null → 立刻 router.replace 回首页
 *   → replace 打在正在创建的页面上（"page is not nullptr"），页面一直不可见
 *   （"skip change page visible: visible 0"），应用直接退出。
 *
 * 所以状态必须挂在**平台的应用级对象**上：
 *   1) this.$app.$def —— quick-app 的应用级对象（app.ux 的导出对象），官方形态；
 *   2) globalThis     —— 框架传给每个页面脚本的同一个全局对象（同一应用共享）；
 *   3) 模块本地容器   —— 都没有时的兜底：页面内一致、跨页不共享（不炸，但退化成修复前）
 *
 * 取到容器时会把同一个对象尽量镜像到所有可用宿主上：某个页面若拿不到 $app.$def，
 * 只要全局对象是共享的，它仍然能拿到同一份状态。
 *
 * 只做"取容器"这一件事，其余业务仍归 app.js。
 */

/** 容器挂在宿主对象上的键（加版本号，避免与旧状态串味） */
export const HOLDER_KEY = '__lrgt_state_v1'

/** 兜底容器：一个宿主都没有时用它 */
let LOCAL = null

function isObj(o) { return !!o && typeof o === 'object' }

/** 运行时全局对象（页面脚本里的 globalThis / global），取不到返回 null */
export function globalObj() {
  try {
    if (typeof globalThis !== 'undefined' && isObj(globalThis)) return globalThis
  } catch (e) { /* 忽略 */ }
  try {
    if (typeof global !== 'undefined' && isObj(global)) return global
  } catch (e) { /* 忽略 */ }
  return null
}

/**
 * 找一个"应用内唯一"的宿主对象。
 * @param who 页面实例（有 $app）或 app 实例（自己有 $def）
 * @returns 宿主对象；实在没有返回 null
 */
export function resolveHolder(who) {
  try {
    // 页面：用 this.$app.$def（app.ux 的导出对象）。先看 $app，避免取到页面自己的 $def。
    if (who && who.$app && isObj(who.$app.$def)) return who.$app.$def
    // app.ux：onCreate 里的 this 就是应用实例，$def 直接挂在它身上
    if (who && isObj(who.$def)) return who.$def
  } catch (e) { /* 访问器抛异常就往下走 */ }
  return globalObj()
}

/**
 * 取（必要时创建）共享状态容器。
 * 同一个应用里的所有页面拿到的是同一个对象（只要宿主可用）。
 */
export function stateOf(who) {
  const primary = resolveHolder(who)
  const g = globalObj()
  const holders = []
  if (primary) holders.push(primary)
  if (g && g !== primary) holders.push(g)

  // 已有容器：优先应用级对象，其次是全局对象上的镜像
  for (let i = 0; i < holders.length; i++) {
    try {
      if (isObj(holders[i][HOLDER_KEY])) return holders[i][HOLDER_KEY]
    } catch (e) { /* 只读宿主，继续找 */ }
  }

  // 新建，并尽量镜像到所有宿主（哪个页面从哪条路进来都是同一份）
  const box = {}
  let put = false
  for (let i = 0; i < holders.length; i++) {
    try {
      holders[i][HOLDER_KEY] = box
      put = true
    } catch (e) { /* 忽略只读宿主 */ }
  }
  if (put) return box

  // 一条宿主都没有：只能退回页面本地（跨页不共享）。留一行日志，真机/模拟器日志里一眼能看见。
  if (!LOCAL) {
    LOCAL = {}
    try {
      console.warn('[liferestart] 没有可用的应用级共享宿主（$app.$def / globalThis），跨页状态退化为页面本地')
    } catch (e) { /* 运行时没有 console 就算了 */ }
  }
  return LOCAL
}
