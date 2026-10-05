/**
 * 轻提示（蓝河的 @blueos.window.prompt）
 * 接口形态各版本可能有差异，全部 try/catch 降级：没有提示也不影响功能。
 */
import prompt from '@blueos.window.prompt'

export function toast(msg) {
  try {
    prompt.showToast({ message: msg })
  } catch (e) { /* 不支持就静默 */ }
}
