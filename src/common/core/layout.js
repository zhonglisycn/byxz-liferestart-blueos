/**
 * 页面高度核算（纯逻辑，不 import 任何平台接口，Node 可直接单测）
 *
 * 背景（用户截图实证，2026-10-05）：「抽词条」页在 432×514 方屏上，底部操作行
 * （换一批 / 下一步）被内容挤出屏幕。根因不是某一页写错了一个高度，而是
 * "每页各自手写高度、没人算总账"：顶栏 50 + 状态 34 + 5 行卡片 275 +
 * 说明块 76 + 按钮行 64 + 页面内边距 22 = 525px > 514px。
 *
 * 这里把"屏幕高度 - 页面内边距 = 可用高度"这条总账集中算一次：
 *   · 每个页面把自己从上到下的区块声明出来（顶栏 / 状态行 / 信息行 / 底部按钮…），
 *     只有"唯一可滚动区"标 flex: true（scroll 占满剩余高度）；
 *   · layout() 返回固定区块用了多少、留给滚动区多少、装不装得下；
 *   · 带 rows 的页面（卡片 / 列表）再算出"一屏能完整看到几行"。
 *
 * 页面样式引用这里返回的数字（滚动区高度、卡片高度都从 layoutOf() 取），
 * 不再各写各的 px；tools/core.test.mjs 逐页断言装得下、底部按钮不在滚动区内。
 *
 * 屏幕参数是 GT2 方屏 432×514（.ide/settings.json 与真机一致），
 * 内边距与 common/style/base.css 的 .page 一一对应；改屏幕/改内边距只改这一处。
 */

/** 目标屏（vivo WATCH GT2 方屏）与页面内边距 */
export const SCREEN = { w: 432, h: 514 }
export const PAGE_PAD = { top: 10, right: 14, bottom: 12, left: 14 }

/** 页面可用高度：屏幕高 - 上下内边距（样式里的 px 就是物理像素，designWidth 432） */
export const AVAIL_H = SCREEN.h - PAGE_PAD.top - PAGE_PAD.bottom

/**
 * 每页的区块表（从上到下；gap 是这一块上方的外边距）。
 * flex: true 的那一块是"唯一可滚动区"，高度由 layout() 算出；
 * min 是该区至少要点亮的内容高度（例如 4 行卡片），不够就是装不下。
 * 数值与各页面 <style> / base.css 的 height 一一对应，改一处要改两处（测试会核对）。
 */
export const PAGE_SPECS = {
  /* 首页：没有滚动区，mid 是 flex:1 的居中区（内容 202px，余量拉开留白） */
  Home: {
    blocks: [
      { k: 'hero', h: 62 },
      { k: 'mid', flex: true, min: 202 },   // 主按钮 76 + 副标题 38 + 入口行 64 + 提示 24
      { k: 'foot', h: 26 }
    ]
  },

  /* 抽词条：三段固定（顶栏 / 信息行 + 已选摘要 / 底部按钮），中间卡片区唯一可滚动 */
  Talents: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'info', h: 30, gap: 2 },
      { k: 'summary', h: 28, gap: 2 },
      { k: 'zone', flex: true, gap: 4, min: 266 },   // 4 行卡片：4×62 + 3×6
      { k: 'btns', h: 64, gap: 6 }
    ],
    rows: { h: 62, gap: 6, count: 5, want: 4 }       // 10 张卡 = 两列 × 5 行，一屏看全 4 行
  },

  /* 分配属性：4 条属性行 + 天赋摘要进滚动区，两个底部按钮行都在滚动区外 */
  Alloc: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'status', h: 34, gap: 2 },
      { k: 'zone', flex: true, min: 224 },           // 4 条属性行：4×(50+6)
      { k: 'ctrls', h: 52, gap: 6 },
      { k: 'go', h: 64, gap: 6 }
    ],
    rows: { h: 50, gap: 6, count: 4, want: 4 }
  },

  /* 逐年推进：顶栏 / 境界条 / 属性行 / 词条入口都固定，"当前事件 + 历程"滚动 */
  Life: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'realm', h: 34 },
      { k: 'status', h: 34, gap: 2 },
      { k: 'pathline', h: 32, gap: 2 },
      { k: 'zone', flex: true, min: 200 },
      { k: 'btn', h: 64, gap: 6 }
    ]
  },

  /* 结算：评级/标签/四格数据固定，结局说明与三份清单滚动，两个胶囊按钮固定在底部 */
  End: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'hero', h: 84 },
      { k: 'tags', h: 40, gap: 6 },
      { k: 'facts', h: 92 },                          // 2×(40+6)，行距已算在里面
      { k: 'zone', flex: true, gap: 4, min: 120 },
      { k: 'btns', h: 64, gap: 6 }
    ]
  },

  /* 图鉴：标签行 / 筛选行 / 完成度固定，条目滚动，翻页行固定在底部 */
  Codex: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'tabs', h: 42, gap: 2 },
      { k: 'filters', h: 38, gap: 4 },
      { k: 'compl', h: 44 },
      { k: 'zone', flex: true, min: 84 },
      { k: 'pager', h: 58 }
    ]
  },

  /* 档案：上半（收集度 / 最近结局）滚动，三个存档槽 + 读写按钮固定在底部，不进滚动区 */
  Archive: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'zone', flex: true, gap: 2, min: 154 },
      { k: 'sec', h: 30 },
      // 3 个 70px 槽位 + 两处 7px 空隙（容器用 space-between 分配）
      { k: 'slots', h: 224, gap: 4, parts: { slotH: 70, slotGap: 7 } }
    ]
  },

  /* 关于与设置：两个开关行固定，玩法/署名长文案滚动 */
  About: {
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'rows', h: 124, gap: 2 },                  // 2×(54+8)
      { k: 'zone', flex: true, min: 60 }
    ]
  }
}

/** 页面清单（README 的高度表与测试都按这个顺序过一遍） */
export const PAGES = ['Home', 'Talents', 'Alloc', 'Life', 'End', 'Codex', 'Archive', 'About']

/**
 * 高度核算：输入屏幕 / 内边距 / 区块表，输出各区块应得高度。
 *
 * @param spec { screen?, pad?, blocks, rows? }
 *        blocks: [{ k, h, gap?, flex?, min? }]，flex 块只有一个（可滚动区）
 * @returns {{
 *   screen, pad, avail,            // 屏幕、内边距、可用高度（屏幕高 - 上下内边距）
 *   blocks,                        // { 区块名: 高度 }，flex 块是算出来的滚动区高度
 *   fixed, gaps, used, zone,       // 固定块合计 / 间距合计 / 合计占用 / 滚动区高度
 *   min, minOk,                    // 滚动区的最低要求 / 是否满足
 *   fits, overflow,                // 页面装不装得下（固定块 + 间距 ≤ 可用高度）
 *   rows: { h, gap, count, want, rowH, visible, pages, enough } | null
 * }}
 */
export function layout(spec) {
  const s = spec || {}
  const screen = s.screen || SCREEN
  const pad = s.pad || PAGE_PAD
  const blocks = s.blocks || []

  const avail = (Number(screen.h) || 0) - (Number(pad.top) || 0) - (Number(pad.bottom) || 0)

  const out = {}
  let fixed = 0
  let gaps = 0
  let flexBlock = null
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const h = Number(b.h) || 0
    gaps += Number(b.gap) || 0
    if (b.parts) {
      // 区块内部的子尺寸（例如档案页的槽位高/槽距），一并交给页面引用
      for (const p in b.parts) out[p] = b.parts[p]
    }
    if (b.flex) {
      flexBlock = b
      continue
    }
    fixed += h
    out[b.k] = h
  }

  // 滚动区（唯一 flex 块）拿到剩余高度；没有负高度，装不下时归 0 并置 overflow
  const zone = Math.max(0, avail - fixed - gaps)
  if (flexBlock) out[flexBlock.k] = zone

  // fits = 固定区块 + 间距没有超过可用高度（页面不溢出；滚动区归 0 也算装不下）
  // minOk = 滚动区不小于区块表要求的 min（例如抽词条页要一屏看全 4 行卡片）
  const min = flexBlock && flexBlock.min ? Number(flexBlock.min) || 0 : 0
  const fits = avail - fixed - gaps >= 0

  const res = {
    screen: { w: Number(screen.w) || 0, h: Number(screen.h) || 0 },
    pad: { top: Number(pad.top) || 0, bottom: Number(pad.bottom) || 0 },
    avail: avail,
    blocks: out,
    fixed: fixed,
    gaps: gaps,
    used: fixed + gaps,
    zone: zone,
    min: min,
    minOk: zone >= min,
    fits: fits,
    overflow: !fits,
    rows: null
  }

  if (s.rows) {
    const r = s.rows
    const h = Number(r.h) || 0
    const gap = Number(r.gap) || 0
    const count = Math.max(0, Math.round(Number(r.count) || 0))
    const want = Math.max(0, Math.round(Number(r.want) || 0))
    const rowH = h + gap
    // 一屏能完整看到的行数：最后一行不需要尾随间距
    const visible = rowH > 0 ? Math.floor((zone + gap) / rowH) : 0
    res.rows = {
      h: h,
      gap: gap,
      count: count,
      want: want,
      rowH: rowH,
      visible: visible,
      pages: visible > 0 ? Math.max(1, Math.ceil(count / visible)) : count,
      // want 是"设计上要一屏看全几行"；装不下由 enough 报告，页面上仍可滚动
      enough: want > 0 ? visible >= want : true
    }
  }

  res.overflow = !res.fits
  return res
}

/** 按页面名核算（页面 import 它取区块高度），opts 可覆盖 screen/pad 供边界测试用 */
export function layoutOf(page, opts) {
  const spec = PAGE_SPECS[page]
  if (!spec) throw new Error('未知页面：' + page)
  return layout({
    screen: (opts && opts.screen) || SCREEN,
    pad: (opts && opts.pad) || PAGE_PAD,
    blocks: spec.blocks,
    rows: spec.rows
  })
}
