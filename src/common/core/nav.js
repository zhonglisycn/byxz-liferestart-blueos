/**
 * 页面跳转入口：所有 router 调用都从这里走，统一过一遍单次闸门。
 *
 * 为什么不让页面直接调 router：
 *   · 重复点击（页面切换慢时几乎必然发生）会把同一个 replace 打成两三次，
 *     第二次撞上"正在创建的同名页"→ 页面不可见 → 应用退出（模拟器实测）；
 *   · 统一入口后，跳转幂等这件事只需要在一个地方保证。
 */
import router from '@blueos.app.appmanager.router'
import { allowNav } from './nav-gate.js'

const gate = {}   // 每个页面 bundle 各有一份（模块内联），页面内去重足够

/** 跳页。replace=true 用 replace（不留返回栈），否则 push。重复请求返回 false */
export function go(uri, replace) {
  if (!allowNav(gate, uri, Date.now())) return false
  try {
    if (replace) router.replace({ uri: uri })
    else router.push({ uri: uri })
    return true
  } catch (e) {
    return false
  }
}

/** 返回上一页；连点两下只回一次（回到根页时第二次会退出应用） */
export function back() {
  if (!allowNav(gate, 'back', Date.now())) return false
  try {
    router.back()
    return true
  } catch (e) {
    return false
  }
}
