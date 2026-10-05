/**
 * 内容池装配（每个页面各自调用一次）
 *
 * 原版把内容装配在 app.ux、页面通过 this.$app.$def.CONTENT 拿同一份引用。
 * 蓝河的打包器是"每个页面一份 bundle"，公共模块会被内联进各页面字节码，
 * 所以这里不做全局共用（也做不到），而是：需要内容的页面在自己的 onInit 里
 * 调一次 ensureContent()，把装配好的池子注入本页面引擎实例（同一页面内只装配一次）。
 *
 * 只用 storage / 纯 JS 的页面（首页、关于）不 import 本模块，字节码里就不会有内容池。
 */
import { buildContent } from './content/index.js'
import { setContent, contentReady } from './engine.js'

export function ensureContent() {
  if (contentReady()) return true
  try {
    return setContent(buildContent())
  } catch (e) {
    return false
  }
}
