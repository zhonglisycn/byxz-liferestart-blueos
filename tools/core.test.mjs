/**
 * 人生重开内核测试（Node）：node tools/core.test.mjs
 *
 * 内核 engine.js / content/ 是从手环版原样搬来的纯 JS，这层测试保证移植后
 * 算法零回归；新增的四组：
 *   · 突破与结算的边界（移植时新补）
 *   · 存档纯逻辑 save.js —— 用内存假 storage 跑，不碰任何平台接口
 *   · 跨页共享状态 shared.js / 导航闸门 nav-gate.js（分配属性页退出事故的修复）
 *   · 图鉴索引 codex-build.js 与预生成的 codex-index.js 逐行一致（防漂移）
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as E from '../src/common/core/engine.js'
import { buildContent } from '../src/common/core/content/index.js'
import { STATS, CODEX_TOTAL } from '../src/common/core/stats.js'
import { CODEX_ROWS, CODEX_SEP } from '../src/common/core/codex-index.js'
import { buildCodexIndex } from '../src/common/core/codex-build.js'
import { resolveHolder, stateOf, HOLDER_KEY } from '../src/common/core/shared.js'
import { allowNav, NAV_GAP, NAV_MIN } from '../src/common/core/nav-gate.js'
import {
  serializeRun, parseRun, isResumable, parseCodex, mergeCodex, codexCount, emptyCodex,
  SLOT_IDS, SLOT_LABEL, slotKey, isSlot, emptySlots, parseSlots, slotInfo,
  serializeLast, parseLast
} from '../src/common/core/save.js'
import {
  rarityCls, rarityName, eventTone, eventToneName, eventToneCls, rankStyle,
  pathStyle, attrUI, deltaCls, splitChanges, percent, barWidth, dotsAt, DOTS
} from '../src/common/core/theme.js'
import { randomAlloc, zeroAll, attrRatio } from '../src/common/core/attr-util.js'
import {
  homeView, archiveView, slotLine, clipText, ARCHIVE_BAR_W, SLOT_EMPTY_SUB, SLOT_SUB_MAX
} from '../src/common/core/views.js'
import { layout, layoutOf, SCREEN, PAGE_PAD, AVAIL_H, PAGES } from '../src/common/core/layout.js'

const ROOT = new URL('..', import.meta.url)

// 内核不自带内容：注入内容池（与页面里 content-setup.js 做的是同一件事）
E.setContent(buildContent())

const results = []
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }) }
  catch (e) { results.push({ name, ok: false, msg: e && e.message }) }
}
function section(t) { console.log('\n=== ' + t + ' ===') }

/** 跑一局（自动分配属性、自动选天赋） */
function autoRun(seed) {
  const run = E.newRun(seed)
  const want = Math.min(10, E.counts().talents)
  const cands = E.drawTalents(run, want)
  assert.equal(cands.length, want, '应抽到 ' + want + ' 个候选天赋')
  E.chooseTalents(run, cands.slice(0, 3).map(t => t.id))
  assert.equal(E.alloc(run, { iq: 5, eq: 5, hp: 5, luck: 5 }), true, '5/5/5/5 应能通过分配')
  let guard = 0
  while (run.alive && guard < 20000) { E.step(run); guard++ }
  return run
}

section('人生重开内核（移植零回归）')

test('抽天赋：候选不重复', () => {
  const run = E.newRun(1234)
  const c = E.drawTalents(run, Math.min(10, E.counts().talents))
  const ids = {}
  c.forEach(t => { assert.ok(!ids[t.id], '候选重复: ' + t.id); ids[t.id] = 1 })
})

test('属性分配：必须正好 20 点', () => {
  const run = E.newRun(1)
  assert.equal(E.alloc(run, { iq: 5, eq: 5, hp: 5, luck: 5 }), true)
  assert.equal(E.alloc(E.newRun(1), { iq: 5, eq: 5, hp: 5, luck: 6 }), false, '21 点应被拒绝')
  assert.equal(E.alloc(E.newRun(1), { iq: 5, eq: 5, hp: 5, luck: 4 }), false, '19 点应被拒绝')
  assert.equal(E.alloc(E.newRun(1), { iq: -1, eq: 6, hp: 5, luck: 10 }), false, '负值应被拒绝')
})

test('天赋效果会应用到属性上', () => {
  const run = E.newRun(7)
  const c = E.drawTalents(run, Math.min(10, E.counts().talents))
  E.chooseTalents(run, [c[0].id])
  assert.equal(run.talents.length, 1)
})

test('推进人生：年龄增长、有日志、最终会死亡', () => {
  const run = autoRun(20260912)
  assert.ok(run.age > 0, '年龄应增长')
  assert.ok(run.log.length > 0, '应产生日志')
  assert.equal(run.alive, false, '最终应死亡')
  assert.ok(run.death, '应有死因')
  assert.ok(run.age < 20000, '不应无限循环')
})

test('属性不会变成负数', () => {
  for (let s = 1; s <= 30; s++) {
    const run = autoRun(s)
    E.ATTRS.forEach(k => assert.ok(run.attrs[k] >= 0, k + ' 变负了'))
  }
})

test('结算：结局/评分/成就齐全', () => {
  const run = autoRun(999)
  const s = E.summary(run)
  assert.ok(s.ending && s.ending.name, '应有结局')
  assert.ok(typeof s.score === 'number' && s.score > 0, '应有评分')
  assert.ok(s.rank && s.rank.rank >= 1, '应有评级')
  assert.ok(Array.isArray(s.achievements), '成就是数组')
})

test('四条体系都能被走到，且处于入门级以上', () => {
  const hit = { cultivate: 0, body: 0, magic: 0, tech: 0 }
  for (let s = 1; s <= 400; s++) {
    const run = autoRun(s * 31)
    if (run.path) {
      hit[run.path.kind] = (hit[run.path.kind] || 0) + 1
      assert.ok(run.path.level >= 1, '入门后至少 1 级')
    }
  }
  console.log('    400 局中各体系局数: ' + JSON.stringify(hit))
  const kinds = Object.keys(hit).filter(k => hit[k] > 0)
  assert.ok(kinds.length >= 2, '至少应该能走到两种体系，实际 ' + kinds.join(','))
})

test('体系资源/特殊属性/劫难的名字各不相同（四套设定生效）', () => {
  const P = E.PATHS
  assert.equal(P.cultivate.res, '修为')
  assert.equal(P.body.res, '气血')
  assert.equal(P.magic.res, '魔力')
  assert.equal(P.tech.res, '知识')
  assert.equal(P.body.sp, '铁骨')
  assert.equal(P.magic.trial, '元素暴动')
  assert.equal(P.tech.fail, '实验事故')
  assert.equal(P.cultivate.ladder.length, 17)
  assert.ok(P.body.ladder.length >= 10 && P.magic.ladder.length >= 10 && P.tech.ladder.length >= 10)
})

test('双修需要天赋：没有 dualPath 时开不了第二条', () => {
  const run = E.newRun(88)
  assert.equal(E.enterPath(run, 'cultivate'), true, '第一条应该能进')
  assert.equal(E.enterPath(run, 'body'), false, '没有双修天赋不该能进第二条')
  run.flags.dualPath = true
  assert.equal(E.enterPath(run, 'body'), true, '有双修天赋后应该能进第二条')
  assert.equal(E.pathText(run).indexOf('｜') >= 0, true)
  assert.equal(E.enterPath(run, 'magic'), false, '最多两条')
})

test('pathText / pathStat 能给界面提供主修与双修信息', () => {
  const run = E.newRun(99)
  E.enterPath(run, 'tech')
  assert.ok(E.pathText(run).indexOf('科技') >= 0)
  const st = E.pathStat(run, 'tech')
  assert.equal(st.def.res, '知识')
  assert.ok(st.name && st.level >= 1)
  assert.equal(E.pathStat(run, 'magic'), null, '没走的体系应返回 null')
})

test('突破：进度不够不破；进度够且突破率拉满能破', () => {
  const run = E.newRun(4321)
  E.enterPath(run, 'cultivate')
  run.path.progress = 0
  assert.equal(E.tryBreakthrough(run), false, '没积累不该破境')
  assert.equal(run.path.level, 1)

  const before = { level: run.path.level, fail: run.path.fail }
  assert.equal(E.tryBreakthrough(run), false, '再来一次还是失败（进度不足）')
  assert.equal(run.path.fail, before.fail, '进度不足不算失败次数')

  // 修炼资源一次性给够 + 突破率 +5（chance 会被夹到 0.98）
  let broke = false
  for (let i = 0; i < 40 && !broke; i++) {
    run.path.progress = 100000
    run.bonus.breakthrough = 5
    broke = E.tryBreakthrough(run)
  }
  assert.ok(broke, '资源与突破率都拉满应该能破境')
  assert.ok(run.path.level > before.level, '破境后境界等级应提高')
})

test('突破失败也会给失败计数（不会静默什么都不发生）', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const run = E.newRun(seed * 97)
    E.enterPath(run, 'body')
    run.path.progress = 100000
    run.bonus.breakthrough = -10                 // 把成功率压到最低
    const before = { level: run.path.level, fail: run.path.fail, sp: run.path.sp }
    E.tryBreakthrough(run)
    const up = run.path.level > before.level
    const felled = run.path.fail > before.fail && run.path.sp < before.sp
    assert.ok(up || felled, '第 ' + seed + " 次尝试：要么破境、要么记一次失败并掉本命属性")
  }
})

test('旧存档兼容：run.cultivation 能迁移成 run.path', () => {
  const old = {
    seed: 1, rngA: 7, age: 40, attrs: { iq: 8, eq: 5, hp: 6, luck: 4 }, baseHp: 6,
    talents: [], items: [], flags: {}, bonus: { lifespan: 100, progressRate: 0, breakthrough: 0, luckRate: 0 },
    cultivation: { active: true, root: 'dual', level: 6, progress: 777, daoHeart: 8, fail: 1 },
    log: [], alive: true, death: '', ending: null, started: true
  }
  const run = E.normalizeRun(old)
  assert.equal(run.path.kind, 'cultivate')
  assert.equal(run.path.level, 6)
  assert.equal(run.path.sp, 8)
  assert.equal(run.cultivation, undefined)
  assert.equal(E.realmName(run), E.PATHS.cultivate.ladder[6].name)
})

test('同种子可复现：两局结果完全一致', () => {
  const a = autoRun(4242)
  const b = autoRun(4242)
  assert.equal(a.age, b.age, '同种子年龄应一致')
  assert.equal(a.log.length, b.log.length, '同种子日志条数应一致')
  assert.equal(E.realmName(a), E.realmName(b), '同种子境界应一致')
  const sa = E.summary(a)
  const sb = E.summary(b)
  assert.equal(sa.score, sb.score, '同种子评分应一致')
  assert.equal(sa.ending.id, sb.ending.id, '同种子结局应一致')
})

test('状态可序列化（能存进 storage 再续玩）', () => {
  const run = E.newRun(555)
  const c = E.drawTalents(run, 10)
  E.chooseTalents(run, c.slice(0, 2).map(t => t.id))
  E.alloc(run, { iq: 5, eq: 5, hp: 5, luck: 5 })
  for (let i = 0; i < 10; i++) E.step(run)
  const json = JSON.stringify(run)
  assert.ok(json.length > 0)
  const back = JSON.parse(json)
  const a = E.step(run)
  const b = E.step(back)
  assert.deepEqual(a, b, '反序列化后继续推进应与原来一致')
})

test('forbidCultivation：写了"此生无法修炼"的词条真的进不去体系', () => {
  const run = E.newRun(20260912)
  E.chooseTalents(run, ['T037'])                 // 天生绝脉
  assert.equal(!!run.flags.noPathOff, true, '应在选择词条时就打上禁止修炼的印记')
  const kinds = ['cultivate', 'body', 'magic', 'tech']
  for (let i = 0; i < kinds.length; i++) {
    assert.equal(E.enterPath(run, kinds[i]), false, '带"天生绝脉"不该能入' + kinds[i])
  }
  assert.equal(!!run.path, false, '四条体系都进不去，run.path 应仍为空')
})

test('effText / reqText：图鉴展示的效果与条件都要能翻译成人话', () => {
  const t = E.talentById('T037')
  assert.ok(E.effText(t.eff).indexOf('无法修炼') >= 0, '实际：' + E.effText(t.eff))
  const c = E.codex()
  assert.equal(E.reqText({ iq: 8, ageMin: 12 }), '智力≥8 年龄≥12')
  assert.equal(E.reqText(null), '无条件')
  assert.ok(c.events && c.events.length > 0, 'codex() 应包含事件池')
})

test('日志封顶：长寿命也不会让日志/存档无限膨胀', () => {
  let maxLen = 0
  let maxJson = 0
  for (let s = 1; s <= 60; s++) {
    const run = autoRun(s * 31 + 5)
    maxLen = Math.max(maxLen, run.log.length)
    maxJson = Math.max(maxJson, JSON.stringify(run).length)
    for (let i = 1; i < run.log.length; i++) {
      assert.ok(run.log[i].seq > run.log[i - 1].seq, 'seq 应严格递增')
    }
    assert.ok(run.log.length <= 300, '日志应被截断到 300 条以内，实际 ' + run.log.length)
  }
  console.log('    60 局：最长日志 ' + maxLen + ' 条，最大存档 ' + Math.round(maxJson / 1024) + ' KB')
  assert.ok(maxJson < 120 * 1024, '单局存档不应超过 120KB，实际 ' + Math.round(maxJson / 1024) + 'KB')
})

section('移植新增：内容规模与存档逻辑')

test('stats.js 与真实内容池一致（内容改了要重跑 gen-stats）', () => {
  const c = E.counts()
  assert.equal(STATS.talents, c.talents, '词条数不一致，跑 node tools/gen-stats.mjs')
  assert.equal(STATS.events, c.events, '事件数不一致')
  assert.equal(STATS.items, c.items, '物品数不一致')
  assert.equal(STATS.endings, c.endings, '结局数不一致')
  assert.equal(STATS.achievements, c.achievements, '成就数不一致')
  assert.equal(STATS.paths, c.paths, '体系数不一致')
  assert.equal(CODEX_TOTAL, c.talents + c.items + c.endings + c.achievements, '图鉴分母不一致')
})

test('存档纯逻辑：只存"活着且已开始"的一局', () => {
  const fresh = E.newRun(11)
  assert.equal(serializeRun(fresh), null, '没开始不该存')
  assert.equal(serializeRun(null), null, '空对象不该存')
  E.alloc(fresh, { iq: 5, eq: 5, hp: 5, luck: 5 })
  assert.ok(typeof serializeRun(fresh) === 'string', '开始后应能存')
  fresh.alive = false
  assert.equal(serializeRun(fresh), null, '死了不该存（否则首页能继续一局死人）')
})

test('存档纯逻辑：坏存档/旧存档都不该把首页带崩', () => {
  assert.equal(parseRun(null), null)
  assert.equal(parseRun(''), null)
  assert.equal(parseRun('{不是 json'), null)
  assert.equal(parseRun('123'), null, '数字不是一局人生')
  const ok = parseRun(JSON.stringify({ started: true, alive: true, age: 3 }))
  assert.equal(ok.age, 3)
  assert.deepEqual(ok.log, [], '缺 log 要补成数组，引擎 normalizeRun 依赖它')
  assert.equal(isResumable(ok), true)
  assert.equal(isResumable({ started: true, alive: false }), false)
  assert.equal(isResumable(null), false)
})

test('图鉴合并：去重累积、老存档缺 P 键能补上、条目计数不含体系', () => {
  let c = emptyCodex()
  c = mergeCodex(c, { pathKinds: ['cultivate'], talents: ['T001', 'T002'], items: ['I001'], ending: 'D001', achievements: ['A001'] })
  c = mergeCodex(c, { pathKinds: ['cultivate', 'body'], talents: ['T002', 'T003'], items: [], ending: 'D001', achievements: ['A001', 'A002'] })
  assert.deepEqual(c.T, ['T001', 'T002', 'T003'], '词条应累积去重')
  assert.deepEqual(c.P, ['cultivate', 'body'], '体系应累积去重')
  assert.deepEqual(c.A, ['A001', 'A002'])
  assert.deepEqual(c.D, ['D001'], '同一结局不该记两次')
  assert.equal(codexCount(c), 3 + 1 + 1 + 2)

  // 老版本图鉴只有 T/I/D/A，没有 P
  const legacy = parseCodex(JSON.stringify({ T: ['T001'], I: [], D: [], A: [] }))
  assert.deepEqual(legacy.P, [], '缺 P 要补成空数组')
  assert.deepEqual(parseCodex('坏数据'), emptyCodex(), '坏图鉴存档当空')
})

test('存档往返：内存假 storage（@blueos.storage.storage 的形态）', () => {
  const mem = {}
  const storage = {
    set(o) { if (o && o.key) { mem[o.key] = String(o.value); if (o.success) o.success() } else if (o && o.fail) o.fail() },
    get(o) {
      if (mem[o.key] !== undefined) { if (o.success) o.success(mem[o.key]) }
      else if (o.fail) o.fail()
    },
    delete(o) { delete mem[o.key]; if (o.success) o.success() }
  }
  // 直接照 app.js 的存法跑一遍。
  // 种子不写死：内容池一扩，随机流就整体位移，原来"能活 15 年"的种子可能第 13 年就死了。
  // 这里在若干种子里找一个 15 年后仍活着的局（找不到就说明内容里出了必死组合，测试该红）。
  let run = null
  for (let s = 1; s <= 60 && !run; s++) {
    const r = E.newRun(s * 13 + 1)
    const cands = E.drawTalents(r, 10)
    E.chooseTalents(r, cands.slice(0, 3).map(t => t.id))
    E.alloc(r, { iq: 4, eq: 4, hp: 6, luck: 6 })
    for (let i = 0; i < 15 && r.alive; i++) E.step(r)
    if (r.alive) run = r
  }
  assert.ok(run, '60 个种子里应至少有一个活过 15 年的局（否则内容里全是致命事件）')
  assert.equal(run.age, 15)
  const text = serializeRun(run)
  assert.ok(text, '活着的局要能拿到存档文本')
  storage.set({ key: 'lrgt_run', value: text, success: function () {} })
  assert.ok(mem.lrgt_run && mem.lrgt_run.length > 10, '存档应写进假 storage')

  let loaded = null
  storage.get({ key: 'lrgt_run', success: function (v) { loaded = parseRun(v) }, fail: function () {} })
  assert.ok(loaded, '应能从假 storage 读回')
  assert.equal(loaded.age, run.age)
  assert.equal(loaded.seed, run.seed)
  assert.deepEqual(loaded.attrs, run.attrs)
  assert.equal(loaded.log.length, run.log.length)

  // 读回来后继续推进，结果与不存的那份一致（存档没丢信息）
  const a = E.step(run)
  const b = E.step(loaded)
  assert.deepEqual(b, a, '存回来的局继续推进应与原局一致')

  // 死了要把存档删掉
  storage.delete({ key: 'lrgt_run' })
  assert.equal(mem.lrgt_run, undefined, '死亡/重开应删除存档')
  let missed = false
  storage.get({ key: 'lrgt_run', success: function () {}, fail: function () { missed = true } })
  assert.equal(missed, true, '删掉后读存档应走 fail 分支')
})

section('跨页共享状态 / 导航闸门（分配属性页退出事故的修复）')

test('共享容器：同一个应用级对象 → 同一个容器（页与页之间才共享）', () => {
  const def = {}
  const pageA = { $app: { $def: def } }
  const pageB = { $app: { $def: def } }
  assert.equal(resolveHolder(pageA), def, '页面应优先用 this.$app.$def 当宿主')
  assert.equal(stateOf(pageA), stateOf(pageB), '同一 $def 的页面必须拿到同一容器')

  // 写进去的东西，另一个页面看得见（模拟器事故的直接回归点）
  stateOf(pageA).run = { age: 3 }
  assert.equal(stateOf(pageB).run.age, 3, 'A 页写的 run，B 页必须读得到')

  // app.ux 的 this 就是应用实例，$def 挂在它身上，也要落到同一个容器
  assert.equal(stateOf({ $def: def }), stateOf(pageA), 'app 实例与页面必须共用容器')

  // 应用级对象上已经有容器时，优先级最高（不被全局镜像覆盖）
  const own = { tag: 'own' }
  assert.equal(stateOf({ $app: { $def: { [HOLDER_KEY]: own } } }), own, '应用级容器优先')

  // 拿不到 $app.$def 的页面（或冷启动时）：从全局对象上拿到镜像的同一份
  const viaGlobal = stateOf({})
  assert.equal(typeof viaGlobal, 'object')
  assert.equal(stateOf({}), viaGlobal, '没有宿主时必须稳定返回同一个容器')
  assert.equal(stateOf(pageA).run.age, 3, '全局镜像与应用级容器是同一份状态')
})

test('导航闸门：同一目标 700ms 内只放一次，过渡期内的异动也丢', () => {
  const g = {}
  assert.equal(allowNav(g, 'pages/Alloc', 10000), true, '第一次放行')
  assert.equal(allowNav(g, 'pages/Alloc', 10100), false, '同一目标 100ms 内重复 → 丢')
  assert.equal(allowNav(g, 'pages/Alloc', 10600), false, '同一目标 600ms 内仍丢')
  assert.equal(allowNav(g, 'pages/Alloc', 10000 + NAV_GAP + 1), true, '过了窗口放行')
  assert.equal(allowNav(g, 'pages/Home', 10000 + NAV_GAP + 1 + NAV_MIN - 1), false,
    '距上次跳转不足 NAV_MIN 的任何跳转都丢')
  assert.equal(allowNav(g, 'pages/Home', 10000 + NAV_GAP + 1 + NAV_MIN), true, '过了最小间隔放行')
  assert.equal(allowNav({}, 'back', 1), true, '空状态第一次放行')
})

test('词条选择会把名字一起记进这一局（分配属性页不必再 import 内容池）', () => {
  const run = E.newRun(20261005)
  assert.deepEqual(run.talentNames, [], '新局应带空的名字数组')
  const cands = E.drawTalents(run, 5)
  const ids = cands.slice(0, 3).map(t => t.id)
  E.chooseTalents(run, ids)
  assert.deepEqual(run.talents, ids)
  assert.deepEqual(run.talentNames, ids.map(id => E.talentById(id).name),
    'talentNames 必须与 talentById 查到的名字一致')
  // 存档往返后仍在（分页/续玩都不受影响）
  const back = parseRun(JSON.stringify(run))
  assert.deepEqual(back.talentNames, run.talentNames)
})

section('图鉴索引（预生成，运行时只拆当前页那十几行）')

test('codex-index.js 与内容池逐行一致（内容改了要重跑 gen-stats）', () => {
  const built = buildCodexIndex(buildContent())
  const keys = ['T', 'I', 'D', 'A', 'E', 'P']
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    assert.equal(CODEX_ROWS[k].length, built.rows[k].length, k + ' 行数不一致')
    for (let j = 0; j < built.rows[k].length; j++) {
      assert.equal(CODEX_ROWS[k][j], built.rows[k][j],
        k + ' 第 ' + j + ' 行与重新生成的结果不一致（跑 node tools/gen-stats.mjs）')
    }
  }
  assert.equal(built.counts.T, STATS.talents)
  assert.equal(built.counts.E, STATS.events)
  assert.equal(built.counts.I, STATS.items)
  assert.equal(built.counts.D, STATS.endings)
  assert.equal(built.counts.A, STATS.achievements)
  assert.equal(built.counts.P, STATS.paths)
})

test('索引行的字段数固定、id 齐全、文本里没有分隔符（拆行契约）', () => {
  assert.equal(CODEX_SEP.length, 1, '分隔符必须是单字符')
  const c = buildContent()
  const expect = { T: c.talents.length, I: c.items.length, D: c.endings.length, A: c.achievements.length, E: c.events.length, P: E.PATH_LIST.length }
  const keys = ['T', 'I', 'D', 'A', 'E', 'P']
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const want = (k === 'P') ? 4 : 5
    assert.equal(CODEX_ROWS[k].length, expect[k], k + ' 条数不对')
    for (let j = 0; j < CODEX_ROWS[k].length; j++) {
      const f = CODEX_ROWS[k][j].split(CODEX_SEP)
      assert.equal(f.length, want, k + ' 第 ' + j + ' 行字段数应为 ' + want + '：' + CODEX_ROWS[k][j])
      assert.ok(f[0] && f[0].length > 0, k + ' 第 ' + j + ' 行没有 id')
      if (k !== 'P') {
        assert.ok(f[1] && f[2], k + ' 第 ' + j + ' 行缺显示名/说明')
        // 事件行的颜色类是"类型配色"（机遇/危机/奇遇/体系/劫难），其余分类按稀有度 r1~r5
        const okCls = (k === 'E') ? /^k-[a-z]+$/.test(f[4]) : /^r[1-5]$/.test(f[4])
        assert.ok(okCls, k + ' 第 ' + j + ' 行颜色类不对：' + f[4])
      }
    }
  }
  // 抽查一条：预生成的文案要与旧图鉴页现拼的完全一样
  const t001 = CODEX_ROWS.T[0].split(CODEX_SEP)
  assert.equal(t001[0], 'T001')
  assert.equal(t001[1], '早八诅咒（凡品）')
  assert.equal(t001[2], '效果：智力-1 · 体质-1 · 寿元-5')
  assert.equal(t001[3], '一上早八就灵魂出窍')
  assert.equal(t001[4], 'r1')
  for (let i = 0; i < CODEX_ROWS.D.length; i++) {
    const f = CODEX_ROWS.D[i].split(CODEX_SEP)
    if (f[0] === 'D055') {
      assert.equal(f[1], '合体大能（传说）', 'rank 5 的结局应显示"（传说）"而不是 undefined')
      assert.equal(f[4], 'r5', 'rank 5 的颜色类')
    }
  }
  const p = CODEX_ROWS.P[0].split(CODEX_SEP)
  assert.equal(p[0], 'cultivate')
  assert.equal(p[1], '修仙')
  assert.equal(p[2], '灵根 灵根 ｜ 资源 修为 ｜ 本命 道心')
  assert.ok(p[3].indexOf('仙人') > 0, '体系行应含完整阶梯')
})

section('内容扩充（第三批，2026-10-05）：增量、覆盖与防漂移')

test('第三批增量：天赋 +15 / 事件 +45 / 结局 +8 / 物品 +10', () => {
  const c = buildContent()
  const ids = (arr) => arr.map(x => x.id)
  const t = ids(c.talents), e = ids(c.events), d = ids(c.endings), i = ids(c.items)
  assert.equal(t.filter(x => /^T6(2[1-9]|3[0-5])$/.test(x)).length, 15, '新天赋应为 15 条（T621~T635）')
  assert.equal(e.filter(x => /^W\d{3}$/.test(x)).length, 45, '新事件应为 45 条（W001~W045）')
  assert.equal(d.filter(x => /^D0(6[6-9]|7[0-3])$/.test(x)).length, 8, '新结局应为 8 条（D066~D073）')
  assert.equal(i.filter(x => /^I1(0[1-9]|10)$/.test(x)).length, 10, '新物品应为 10 条（I101~I110）')
  // 总数口径与 stats.js 一致（内容一改就要重跑 gen-stats）
  assert.equal(STATS.talents, c.talents.length)
  assert.equal(STATS.events, c.events.length)
  assert.equal(STATS.items, c.items.length)
  assert.equal(STATS.endings, c.endings.length)
  assert.equal(STATS.achievements, c.achievements.length)
  console.log('    当前内容池：词条 ' + c.talents.length + ' / 事件 ' + c.events.length +
    ' / 物品 ' + c.items.length + ' / 结局 ' + c.endings.length + ' / 成就 ' + c.achievements.length)
})

test('新内容 id 不重复、字段完整、文案长度合规', () => {
  const c = buildContent()
  const pools = [
    { arr: c.talents, need: ['id', 'name', 'rarity', 'tag', 'desc', 'eff'] },
    { arr: c.events, need: ['id', 'title', 'text', 'age', 'kind', 'eff'] },
    { arr: c.items, need: ['id', 'name', 'kind', 'rarity', 'desc', 'eff'] },
    { arr: c.endings, need: ['id', 'name', 'rank', 'desc', 'req'] }
  ]
  const isNew = (id) => /^T6(2[1-9]|3[0-5])$/.test(id) || /^W\d{3}$/.test(id) ||
    /^I1(0[1-9]|10)$/.test(id) || /^D0(6[6-9]|7[0-3])$/.test(id)
  const seen = {}
  for (const p of pools) {
    for (const x of p.arr) {
      assert.ok(!seen[x.id], 'id 重复：' + x.id)
      seen[x.id] = 1
      if (!isNew(x.id)) continue
      for (const k of p.need) {
        assert.ok(x[k] !== undefined && x[k] !== null && x[k] !== '', x.id + ' 缺字段 ' + k)
      }
    }
  }
  // 新事件文案 20~60 字（有梗、可读，不是流水账）
  const we = c.events.filter(x => /^W\d{3}$/.test(x.id))
  for (const x of we) {
    assert.ok(x.text.length >= 20 && x.text.length <= 60, x.id + ' 文案长度 ' + x.text.length + ' 不在 20~60')
  }
  // 新词条不与**旧**词条重名（本批内部也查一遍）
  const oldNames = {}
  c.talents.forEach(x => { if (!/^T6(2[1-9]|3[0-5])$/.test(x.id)) oldNames[x.name] = 1 })
  const mine = {}
  c.talents.forEach(x => {
    if (!/^T6(2[1-9]|3[0-5])$/.test(x.id)) return
    assert.ok(!oldNames[x.name], '新词条与旧词条重名：' + x.name)
    assert.ok(!mine[x.name], '新词条内部重名：' + x.name)
    mine[x.name] = 1
  })
})

test('内容引用的物品 id 都存在（eff.item 不许指向空气）', () => {
  const c = buildContent()
  const have = {}
  c.items.forEach(x => { have[x.id] = 1 })
  const bad = []
  const scan = (arr, tag) => arr.forEach(x => {
    if (x.eff && x.eff.item && !have[x.eff.item]) bad.push(tag + ':' + x.id + ' -> ' + x.eff.item)
  })
  scan(c.talents, 'T')
  scan(c.events, 'E')
  scan(c.items, 'I')
  assert.deepEqual(bad, [], '引用了不存在的物品：' + bad.join(' '))
})

test('新事件覆盖四个年龄段与四属性门槛，并有体系/物品/结局挂钩', () => {
  const c = buildContent()
  const we = c.events.filter(x => /^W\d{3}$/.test(x.id))
  const young = we.filter(x => x.age[1] <= 12).length
  const youth = we.filter(x => x.age[0] >= 13 && x.age[1] <= 30).length
  const mid = we.filter(x => x.age[0] >= 31 && x.age[1] <= 60).length
  const old = we.filter(x => x.age[0] >= 61).length
  assert.ok(young >= 8 && youth >= 8 && mid >= 8 && old >= 6, '四个年龄段都要有覆盖，实际 ' + [young, youth, mid, old].join('/'))
  console.log('    新事件年龄段：幼年 ' + young + ' / 青年 ' + youth + ' / 中年 ' + mid + ' / 晚年 ' + old)
  // 四属性门槛各有覆盖
  const reqHas = (k) => we.filter(x => x.req && typeof x.req[k] === 'number').length
  const ltKeys = new Set()
  we.forEach(x => { if (x.req && x.req.lt) Object.keys(x.req.lt).forEach(k => ltKeys.add(k)) })
  assert.ok(reqHas('iq') >= 1 && reqHas('eq') >= 1 && reqHas('hp') >= 1 && reqHas('luck') >= 1,
    'iq/eq/hp/luck 都要有门槛条目：' + [reqHas('iq'), reqHas('eq'), reqHas('hp'), reqHas('luck')].join('/'))
  assert.ok(ltKeys.size >= 1, '要有"低于门槛"的条目（给低属性玩法）')
  // 体系联动 ≥8：给门派的 4 条 + req.path 限定的成长事件
  const sys = we.filter(x => (x.req && x.req.path) || (x.eff && (x.eff.enterPath || x.eff.spiritRoot)))
  assert.ok(sys.length >= 8, '体系联动事件应 ≥8，实际 ' + sys.length)
  assert.ok(we.filter(x => x.eff && x.eff.item).length >= 6, '触发物品的事件应 ≥6')
  // 与结局挂钩：新结局要的 flag / 物品，能由新事件产出的都算（flag 线与物品线）
  const newEndings = c.endings.filter(x => /^D0(6[6-9]|7[0-3])$/.test(x.id))
  const wantFlags = [], wantItems = []
  newEndings.forEach(x => {
    const r = x.req || {}
    if (r.flags) r.flags.forEach(f => { if (wantFlags.indexOf(f) < 0) wantFlags.push(f) })
    if (r.items) r.items.forEach(v => { if (wantItems.indexOf(v) < 0) wantItems.push(v) })
  })
  const linked = we.filter(x => {
    const e = x.eff || {}
    return (e.flag && wantFlags.indexOf(e.flag) >= 0) || (e.item && wantItems.indexOf(e.item) >= 0)
  })
  assert.ok(linked.length >= 4, '与结局挂钩的事件应 ≥4（flag 线 + 物品线），实际 ' + linked.length +
    '：' + linked.map(x => x.id).join(','))
  console.log('    新事件：体系 ' + sys.length + ' 条 / 物品 ' + we.filter(x => x.eff && x.eff.item).length +
    ' 条 / 结局挂钩 ' + linked.length + ' 条')
})

test('新词条稀有度分档且有取舍（高分条目都带代价）', () => {
  const c = buildContent()
  const mine = c.talents.filter(x => /^T6(2[1-9]|3[0-5])$/.test(x.id))
  const byR = {}
  mine.forEach(x => { byR[x.rarity] = (byR[x.rarity] || 0) + 1 })
  assert.ok(byR[1] >= 4, '凡品至少 4 条')
  assert.ok(byR[2] >= 3, '灵品至少 3 条')
  assert.ok(byR[3] >= 2, '仙品至少 2 条')
  assert.ok(byR[4] >= 1, '至少有 1 条神品')
  // 稀有度越高越要有代价：稀有 ≥3 的条目至少要有一条负属性/减寿/负面 flag
  mine.forEach(x => {
    if (x.rarity < 3) return
    const e = x.eff || {}
    const cost = ['iq', 'eq', 'hp', 'luck'].some(k => (e[k] || 0) < 0) ||
      (e.lifespan || 0) < 0 || !!e.forbidCultivation || (e.dieChance || 0) > 0
    assert.ok(cost, x.id + ' 稀有度 ≥3 却没有代价')
  })
  console.log('    新词条稀有度分布：' + JSON.stringify(byR))
})

test('新物品全都能拿到（有事件/词条发放），新结局全都能命中', () => {
  const c = buildContent()
  const refs = {}
  c.events.forEach(x => { if (x.eff && x.eff.item) refs[x.eff.item] = 1 })
  c.talents.forEach(x => { if (x.eff && x.eff.item) refs[x.eff.item] = 1 })
  for (let i = 101; i <= 110; i++) assert.ok(refs['I' + i], 'I' + i + ' 没有任何获取途径')

  // 8 条新结局逐一构造条件，确认 resolveEnding 能命中（否则等于死内容）
  const hit = (id, f) => {
    const r = E.newRun(9182)
    r.attrs = { iq: 9, eq: 9, hp: 9, luck: 9 }
    r.age = 66
    f(r)
    const got = E.resolveEnding(r)
    assert.equal(got.id, id, id + ' 未命中，实际 ' + got.id + '（' + got.name + '）')
  }
  hit('D066', r => { r.items.push('I101') })
  hit('D067', r => { r.flags.corporate_slave = true; r.age = 50 })
  hit('D068', r => {
    r.flags.dualPath = true; r.flags.cross_path_master = true
    r.path = { kind: 'body', level: 4, progress: 0, sp: 5, fail: 0 }
    r.path2 = { kind: 'tech', level: 3, progress: 0, sp: 5, fail: 0 }
  })
  hit('D069', r => {
    r.path = { kind: 'body', level: 6, progress: 0, sp: 5, fail: 0 }
    r.items.push('I108'); r.flags.lamp_keeper = true; r.age = 220
  })
  hit('D070', r => { r.flags.library_keeper = true; r.attrs.iq = 13 })
  hit('D071', r => { r.flags.late_bloomer_lived = true; r.age = 85 })
  // 隐藏结局 1：双修 + 开宗立派 + 无人走过（与成就 A063/A064 同一批 flag）
  hit('D072', r => {
    r.flags.dualPath = true; r.flags.two_paths_legend = true; r.flags.founded_school = true
    r.attrs.iq = 16; r.attrs.luck = 14; r.age = 320
  })
  // 隐藏结局 2：修仙十六境 + 三次渡劫 + 逆天改命（与成就 A032/A065 联动）
  hit('D073', r => {
    r.path = { kind: 'cultivate', level: 16, progress: 0, sp: 5, fail: 0 }
    r.flags.tribulation_x3 = true; r.flags.defied_fate = true; r.attrs.luck = 15; r.age = 400
  })
})

test('新事件真的会在一局里出现（跑 120 局统计命中）', () => {
  const seen = {}
  for (let s = 1; s <= 120; s++) {
    const run = autoRun(77000 + s * 7)
    for (let i = 0; i < run.log.length; i++) {
      const t = run.log[i].title
      if (t) seen[t] = 1
    }
  }
  const c = buildContent()
  const we = c.events.filter(x => /^W\d{3}$/.test(x.id))
  let fired = 0
  for (const x of we) if (seen[x.title]) fired++
  assert.ok(fired >= 3, '120 局里至少应命中 3 条新事件，实际 ' + fired)
  console.log('    120 局命中新事件 ' + fired + ' / ' + we.length + ' 条')
})

section('表现层映射（theme.js）与属性分配辅助（attr-util.js）')

test('稀有度 / 事件类型 / 评级 / 体系 / 属性映射都是稳定值', () => {
  assert.equal(rarityCls(1), 'r1')
  assert.equal(rarityCls(4), 'r4')
  assert.equal(rarityCls(9), 'r5', '越界钳到 5')
  assert.equal(rarityCls(0), 'r1', '0 也是 1')
  assert.equal(rarityName(3), '仙品')
  assert.equal(eventToneCls('danger'), 'k-danger')
  assert.equal(eventToneName('danger'), '危机')
  assert.equal(eventToneCls('item'), 'k-fate')
  assert.equal(eventToneCls('未知类型').slice(0, 2), 'k-', '未知 kind 回退到机遇而不是空')
  assert.equal(rankStyle(5).letter, 'S')
  assert.equal(rankStyle(5).cls, 'rk5')
  assert.equal(rankStyle(3).letter, 'B')
  assert.equal(rankStyle(0).letter, 'D', '越界回退到最低档')
  assert.equal(pathStyle('tech').name, '科技')
  assert.equal(pathStyle('tech').cls, 'p-tech')
  assert.equal(pathStyle('none').name, '凡人')
  assert.equal(attrUI('luck').short, '运')
  assert.equal(attrUI('iq').cls, 'a-iq')
})

test('属性变化高亮：+绿 −红、其它中性', () => {
  assert.equal(deltaCls('智力+1'), 'd-up')
  assert.equal(deltaCls('体质-2'), 'd-down')
  assert.equal(deltaCls('获得法宝「青锋剑」'), 'd-flat')
  assert.equal(deltaCls('大难不死'), 'd-flat')
  assert.equal(deltaCls(undefined), 'd-flat')
  const arr = splitChanges(['智力+1', '体质-2', '获得法宝「青锋剑」'])
  assert.deepEqual(arr.map(x => x.cls), ['d-up', 'd-down', 'd-flat'])
  assert.deepEqual(splitChanges(null), [])
  assert.deepEqual(splitChanges([null, '']), [])
})

test('进度条与三点指示：不产生 NaN、边界钳位', () => {
  assert.equal(percent(1, 4), 25)
  assert.equal(percent(0, 0), 0, '分母 0 返回 0')
  assert.equal(percent(9, 4), 100, '超过 100 钳到 100')
  assert.equal(barWidth(1, 4, 200), 50)
  assert.equal(barWidth(3, 4, 200), 150)
  assert.equal(barWidth(1, 0, 200), 0)
  assert.deepEqual(DOTS, ['·', '··', '···'])
  assert.equal(dotsAt(0), '·')
  assert.equal(dotsAt(1), '··')
  assert.equal(dotsAt(2), '···')
  assert.equal(dotsAt(3), '·', '循环回第一个')
})

test('随机分配：点数守恒、可复现、重置为 0', () => {
  const keys = ['iq', 'eq', 'hp', 'luck']
  // 固定随机序列 → 结果可复现，且恒为 20 点
  const seq = [0.1, 0.9, 0.5, 0.5, 0.99, 0.0, 0.33, 0.7]
  let n = 0
  const rand = () => seq[(n++) % seq.length]
  const a = randomAlloc(20, keys, rand)
  n = 0
  const b = randomAlloc(20, keys, rand)
  assert.deepEqual(a, b, '同一随机序列结果应一致')
  let sum = 0
  keys.forEach(k => { sum += a[k]; assert.ok(a[k] >= 0 && Number.isInteger(a[k]), k + ' 应为非负整数') })
  assert.equal(sum, 20, '随机分配必须正好 20 点')
  // 200 次随机都不越界（引擎 alloc 只接受正好 20 点）
  for (let i = 0; i < 200; i++) {
    const r = randomAlloc(E.TOTAL_POINTS, keys)
    let s = 0
    keys.forEach(k => { s += r[k] })
    assert.equal(s, E.TOTAL_POINTS)
    assert.equal(E.alloc(E.newRun(i + 1), r), true, '随机结果应能通过引擎 alloc 校验')
  }
  assert.deepEqual(zeroAll({}, keys), { iq: 0, eq: 0, hp: 0, luck: 0 })
  assert.equal(attrRatio(10, 20), 0.5)
  assert.equal(attrRatio(30, 20), 1, '比例钳到 1')
  assert.equal(attrRatio(5, 0), 0)
})

section('存档槽（2 手动 + 1 自动）与最近结算记录')

test('槽位键名沿用 lrgt_ 前缀，只有三个合法槽', () => {
  assert.deepEqual(SLOT_IDS, ['auto', 's1', 's2'])
  assert.equal(slotKey('auto'), 'lrgt_run', '自动档沿用老键，老存档升级后不丢')
  assert.equal(slotKey('s1'), 'lrgt_slot1')
  assert.equal(slotKey('s2'), 'lrgt_slot2')
  assert.equal(slotKey('乱写'), 'lrgt_run', '非法槽回退自动档，不产生新前缀')
  assert.equal(isSlot('s1'), true)
  assert.equal(isSlot('s3'), false)
  assert.deepEqual(Object.keys(emptySlots()), ['auto', 's1', 's2'])
  assert.equal(SLOT_LABEL.s2, '存档二')
})

test('槽位解析：坏档当空、死了的局不进槽、好档原样读回', () => {
  const run = autoRun(31337)
  assert.equal(run.alive, false, 'autoRun 跑到底应该已死亡')
  const alive = E.newRun(5)
  E.alloc(alive, { iq: 5, eq: 5, hp: 5, luck: 5 })
  const dead = E.newRun(6)
  E.alloc(dead, { iq: 5, eq: 5, hp: 5, luck: 5 })
  E.step(dead)
  dead.alive = false
  const slots = parseSlots({
    auto: JSON.stringify(alive),
    s1: '{不是 json',
    s2: JSON.stringify(dead)
  })
  assert.ok(slots.auto && slots.auto.age === 0, '自动档应读回活着的局')
  assert.equal(slots.s1, null, '坏档当空')
  assert.equal(slots.s2, null, '已死的局不该进槽（首页不能续一局死人）')
  assert.equal(slotInfo(slots.auto).empty, false)
  assert.equal(slotInfo(slots.auto).age, 0)
  assert.equal(slotInfo(null).empty, true)
  assert.equal(slotInfo(undefined).empty, true)
})

test('槽位往返：存进 s1 再读回，续玩结果与内存里一致', () => {
  const mem = {}
  const storage = {
    set(o) { if (o && o.key) { mem[o.key] = String(o.value); if (o.success) o.success() } },
    get(o) { if (mem[o.key] !== undefined) { if (o.success) o.success(mem[o.key]) } else if (o.fail) o.fail() },
    delete(o) { delete mem[o.key]; if (o.success) o.success() }
  }
  let run = null
  for (let s = 1; s <= 60 && !run; s++) {
    const r = E.newRun(s * 29 + 3)
    const cands = E.drawTalents(r, 10)
    E.chooseTalents(r, cands.slice(0, 3).map(t => t.id))
    E.alloc(r, { iq: 5, eq: 5, hp: 5, luck: 5 })
    for (let i = 0; i < 12 && r.alive; i++) E.step(r)
    if (r.alive) run = r
  }
  assert.ok(run, '应找到一个活过 12 年的局')
  storage.set({ key: slotKey('s1'), value: serializeRun(run), success: function () {} })
  assert.ok(mem.lrgt_slot1 && mem.lrgt_slot1.length > 10, '手动槽应写进 lrgt_slot1')
  assert.equal(mem.lrgt_run, undefined, '写 s1 不该动自动档')
  let back = null
  storage.get({ key: slotKey('s1'), success: function (v) { back = parseRun(v) }, fail: function () {} })
  assert.ok(back, '应能从 s1 读回')
  const a = E.step(run), b = E.step(back)
  assert.deepEqual(b, a, '读回后继续推进应与原局一致')
  // 三个槽互不干扰
  const slots = parseSlots({ auto: null, s1: mem.lrgt_slot1, s2: null })
  assert.ok(slots.s1)
  assert.equal(slots.auto, null)
  assert.equal(slots.s2, null)
})

test('最近结算记录：正常往返、坏数据当没有、字段钳位', () => {
  const text = serializeLast({ name: '飞升成仙', rank: 5, score: 12345, age: 620, path: '修仙·仙人', talents: 3, items: 4 })
  assert.ok(text)
  const back = parseLast(text)
  assert.equal(back.name, '飞升成仙')
  assert.equal(back.rank, 5)
  assert.equal(back.age, 620)
  assert.equal(back.path, '修仙·仙人')
  // 越界值钳位，不让首页显示负数/天文数字
  const weird = parseLast(JSON.stringify({ name: 'x', rank: 99, score: -5, age: -3, talents: -1 }))
  assert.equal(weird.rank, 5)
  assert.equal(weird.score, 0)
  assert.equal(weird.age, 0)
  assert.equal(weird.talents, 0)
  assert.equal(serializeLast({}), null, '没有结局名不该存')
  assert.equal(parseLast('坏数据'), null)
  assert.equal(parseLast(null), null)
})

section('引擎新增只读访问器：pathLine（顶部境界条）')

test('pathLine：没体系返回 null，有体系给出境界/资源/进度且只读', () => {
  const run = E.newRun(66)
  assert.equal(E.pathLine(run), null, '凡人没有境界条')
  E.enterPath(run, 'tech')
  const line = E.pathLine(run)
  assert.equal(line.kind, 'tech')
  assert.equal(line.path, '科技')
  assert.equal(line.resName, '知识')
  assert.equal(line.spName, '严谨')
  assert.ok(line.realm && line.realm.length > 0)
  assert.ok(line.pct >= 0 && line.pct <= 100, 'pct 应在 0~100')
  // 只读：调用两次不改 run，也不动随机流
  const before = JSON.stringify(run)
  E.pathLine(run)
  E.pathLine(run)
  assert.equal(JSON.stringify(run), before, 'pathLine 不能改 run')
  // 进度大于下一阶门槛时 pct 也是 100 封顶
  run.path.progress = 1e9
  assert.equal(E.pathLine(run).pct, 100)
  // 顶阶：need=0、top=true
  run.path.level = E.PATHS.tech.ladder.length - 1
  const top = E.pathLine(run)
  assert.equal(top.need, 0)
  assert.equal(top.top, true)
  assert.equal(top.pct, 100)
})

section('首页改版（三态）与档案页数据组装（views.js）')

/** 造一份"活着的存档"：isResumable 只看 started/alive，三态测试不依赖随机流 */
function fakeRun(age) {
  return { started: true, alive: true, age: age, log: [], talents: [], items: [], flags: {}, attrs: {} }
}

test('首页三态：无档=重开人生 / 有档=继续人生 / 多槽按当前选中的槽', () => {
  // 1) 无档：主按钮回"重开人生"
  let v = homeView({ slots: emptySlots(), slot: 'auto' })
  assert.equal(v.canResume, false)
  assert.equal(v.startText, '重开人生')
  assert.equal(v.age, 0)
  assert.equal(v.slotName, '自动档')
  assert.ok(v.startSub.indexOf('抽词条') >= 0)

  // 2) 有档（自动档里有一局 12 岁的局）：主按钮"继续人生"+槽位名
  const auto = fakeRun(12)
  v = homeView({ slots: { auto: auto, s1: null, s2: null }, slot: 'auto' })
  assert.equal(v.canResume, true)
  assert.equal(v.startText, '继续人生')
  assert.equal(v.age, 12)
  assert.equal(v.startSub, '接着 12 岁往下走 · 自动档')

  // 3) 多槽：三个槽都有档，当前选中 s2 → 读的是 s2 的年龄与槽名
  v = homeView({ slots: { auto: auto, s1: fakeRun(30), s2: fakeRun(7) }, slot: 's2' })
  assert.equal(v.canResume, true)
  assert.equal(v.age, 7, '要按当前槽的年龄，不是自动档的')
  assert.equal(v.slotName, '存档二')
  assert.ok(v.startSub.indexOf('存档二') >= 0, '副标题要写清读的是哪个槽：' + v.startSub)

  // 多槽 + 选中一个空槽：那一槽没得续 → 回到"重开人生"（即便别的槽有档）
  v = homeView({ slots: { auto: auto, s1: null, s2: auto }, slot: 's1' })
  assert.equal(v.canResume, false)
  assert.equal(v.startText, '重开人生')
  assert.equal(v.slotName, '存档一')
})

test('档案页：收集度（已得/总数/百分比/进度条）与图鉴同一口径', () => {
  const T = [], I = [], D = [], A = []
  for (let i = 0; i < 250; i++) T.push('T' + i)
  for (let i = 0; i < 25; i++) I.push('I' + i)
  for (let i = 0; i < 20; i++) D.push('D' + i)
  for (let i = 0; i < 11; i++) A.push('A' + i)
  const v = archiveView({ slots: emptySlots(), slot: 'auto', last: null, codexSeen: { T, I, D, A, P: ['cultivate'] } }, '')
  assert.equal(v.got, 306, '已得 = 词条+物品+结局+成就，体系不计入')
  assert.equal(v.denom, CODEX_TOTAL)
  assert.equal(v.pct, 25)
  assert.equal(v.barW, barWidth(306, CODEX_TOTAL, ARCHIVE_BAR_W))
  assert.ok(v.barW > 0 && v.barW <= ARCHIVE_BAR_W, '进度条填充要在轨道内：' + v.barW)
  assert.equal(v.hasLast, false)
  assert.equal(v.last.line, '', '没有结算记录时给空串，模板走占位分支')

  // 空图鉴 / 缺字段都不产生 NaN
  const z = archiveView({ codexSeen: emptyCodex() }, '')
  assert.equal(z.got, 0)
  assert.equal(z.pct, 0)
  assert.equal(z.barW, 0)
})

test('档案页：最近结局与评级（有则显示、坏记录当没有）', () => {
  const rec = parseLast(serializeLast({ name: '合体大能', rank: 5, score: 8888, age: 500, path: '修仙·合体期' }))
  const v = archiveView({ slots: emptySlots(), slot: 'auto', last: rec }, '')
  assert.equal(v.hasLast, true)
  assert.equal(v.last.letter, 'S')
  assert.equal(v.last.rankName, '传说')
  assert.equal(v.last.cls, 'rk5')
  assert.equal(v.last.line, '合体大能 · 享年 500 岁 · 评分 8888')
  assert.equal(archiveView({ last: parseLast('坏数据') }, '').hasLast, false, '坏记录不该让档案页显示半截结局')
  assert.equal(archiveView({ last: { name: '', rank: 3 } }, '').hasLast, false)
})

test('档案页三槽位：空档提示 / 有档摘要（年龄 · 体系·境界）/ 选中态 / 能否读取', () => {
  const run = E.newRun(20261005)
  E.alloc(run, { iq: 5, eq: 5, hp: 5, luck: 5 })
  assert.equal(E.enterPath(run, 'cultivate'), true, '应能入修仙')
  const v = archiveView({ slots: { auto: null, s1: run, s2: null }, slot: 's1' }, '')
  assert.deepEqual(v.slotCards.map(c => c.id), ['auto', 's1', 's2'], '槽位顺序固定 auto → s1 → s2')
  const byId = {}
  v.slotCards.forEach(c => { byId[c.id] = c })

  assert.equal(byId.auto.sub, SLOT_EMPTY_SUB, '空档要有提示')
  assert.equal(byId.auto.empty, true)
  assert.equal(byId.auto.canRead, false, '空档不能读取')
  assert.equal(byId.auto.tag, '')
  assert.equal(byId.s1.sub, (run.age || 0) + '岁 · 修仙·' + E.realmName(run))
  assert.ok(byId.s1.sub.indexOf('修仙·') > 0, '有档要显示体系与境界：' + byId.s1.sub)
  assert.equal(byId.s1.empty, false)
  assert.equal(byId.s1.canRead, true)
  assert.equal(byId.s1.sel, true, '当前槽要有选中态')
  assert.equal(byId.s1.tag, '当前')
  assert.equal(byId.s2.sel, false)
  assert.equal(byId.s2.tag, '')

  // 没走体系的一局：显示"凡人"而不是"修仙·凡体"这种怪组合
  assert.equal(slotLine({ started: true, alive: true, age: 9 }), '9岁 · 凡人')
  assert.equal(slotLine(null), SLOT_EMPTY_SUB)
  assert.equal(slotLine({ started: true, alive: false, age: 9 }), SLOT_EMPTY_SUB, '死了的局不算可续')
})

test('档案页：删除是两段式，按钮文案只跟着 confirmId 走', () => {
  const v1 = archiveView({ slots: emptySlots(), slot: 'auto' }, '')
  assert.deepEqual(v1.slotCards.map(c => c.delText), ['删除', '删除', '删除'])
  assert.deepEqual(v1.slotCards.map(c => c.confirming), [false, false, false])

  const v2 = archiveView({ slots: emptySlots(), slot: 'auto' }, 's2')
  const byId = {}
  v2.slotCards.forEach(c => { byId[c.id] = c })
  assert.equal(byId.s2.confirming, true)
  assert.equal(byId.s2.delText, '确认删除')
  assert.equal(byId.auto.delText, '删除', '只影响被点的那一槽')
  assert.equal(byId.s1.delText, '删除')

  // 按压态 key 每槽独立（按一个不该亮两个）
  const keys = v1.slotCards.map(c => c.rKey).concat(v1.slotCards.map(c => c.dKey))
  assert.equal(new Set(keys).size, 6)
})

test('槽位摘要截断：超长截成 n-1 字 + 省略号，不会把固定高度的卡片顶出格子', () => {
  assert.equal(clipText('12345', 5), '12345')
  assert.equal(clipText('123456', 5), '1234…')
  assert.equal(clipText('', 5), '')
  assert.equal(clipText(null, 5), '')
  assert.equal(clipText('abc', 0), '')
  const long = { started: true, alive: true, age: 12345678, path: { kind: 'tech', level: 6 } }
  const line = slotLine(long)
  assert.equal(line.length, SLOT_SUB_MAX)
  assert.ok(line.indexOf('…') >= 0, '超长要截断：' + line)
})

test('首页只留标题/主按钮/两个入口：收集度与槽位明细不再绑在首页模板上', () => {
  const home = fs.readFileSync(new URL('src/pages/Home/index.ux', ROOT), 'utf8')
  const tpl = home.slice(home.indexOf('<template>'), home.indexOf('</template>'))
  const moved = ['{{got}}', '{{denom}}', '{{pct}}', '{{barW}}', '{{slotCards}}', '{{hasLast}}', '{{last.']
  moved.forEach(k => assert.equal(tpl.indexOf(k), -1, '首页模板不该再绑 ' + k + '（应在档案页）'))
  assert.ok(tpl.indexOf('goArchive') > 0, '档案入口应在首页')
  assert.ok(tpl.indexOf('goAbout') > 0, '设置入口应在首页')

  const mf = JSON.parse(fs.readFileSync(new URL('src/manifest.json', ROOT), 'utf8'))
  assert.equal(mf.router.entry, 'pages/Home', '入口页不变')
  assert.equal(mf.router.pages['pages/Archive'].component, 'index', 'component 固定 index')
  const pages = Object.keys(mf.router.pages)
  assert.equal(pages.length, 8, '页面清单应为 8 页：' + pages.join(','))
  assert.ok(pages.indexOf('pages/Archive') >= 0)
})

/* ------------------------------------------------------------------ */

section('布局总账（432×514）与底部操作可见性（本轮修复）')

/** 读工程内文件（相对工程根） */
function read(rel) {
  return fs.readFileSync(new URL(rel, ROOT), 'utf8')
}

/** 取 .ux 的 <template> 段 */
function tplOf(rel) {
  const raw = read(rel)
  const a = raw.indexOf('<template>')
  const b = raw.indexOf('</template>')
  return a >= 0 && b > a ? raw.slice(a, b) : ''
}

/** 取样式里某个 class 的声明块内容（cls 形如 '.info'） */
function cssBlock(text, cls) {
  const m = new RegExp('\\' + cls + '\\s*\\{([\\s\\S]*?)\\}').exec(text)
  return m ? m[1] : ''
}

/** 取声明块里某个属性的值（如 'height'） */
function declOf(block, name) {
  const m = new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;]+)').exec(block)
  return m ? m[1].trim() : ''
}

/** 模板里的 <scroll> 区间 [start, end)，支持嵌套（本项目没有嵌套） */
function scrollRanges(tpl) {
  const re = /<scroll\b[^>]*>|<\/scroll>/g
  const stack = []
  const ranges = []
  let m
  while ((m = re.exec(tpl))) {
    if (m[0] === '</scroll>') {
      const s = stack.pop()
      if (s !== undefined) ranges.push([s, m.index])
    } else {
      stack.push(m.index)
    }
  }
  return ranges
}

/** 递归列出 src 下的 .ux / .css 文件（dir 必须带结尾斜杠） */
function styleFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = new URL(e.name + (e.isDirectory() ? '/' : ''), dir)
    if (e.isDirectory()) styleFiles(p, out)
    else if (/\.(ux|css)$/.test(e.name)) out.push(p)
  }
  return out
}

test('layout：可用高度 = 屏幕高 − 上下内边距；固定块 + 间距 + 滚动区 = 可用高度', () => {
  const r = layout({
    screen: SCREEN,
    pad: PAGE_PAD,
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'zone', flex: true },
      { k: 'btn', h: 64, gap: 6 }
    ]
  })
  assert.equal(r.avail, 492, '514 − 10 − 12 = 492')
  assert.deepEqual(r.blocks, { topbar: 50, btn: 64, zone: 372 })
  assert.equal(r.used, 120)
  assert.equal(r.used + r.zone, r.avail, '占用 + 滚动区必须正好等于可用高度')
  assert.equal(r.fits, true)
  assert.equal(r.overflow, false)
  assert.equal(r.minOk, true)
})

test('layout 边界：超屏归零报 overflow / 空参数 / 小屏 / rows 分页', () => {
  // 超屏：固定块加起来比可用高度还高 → 滚动区归 0，报 overflow（不产生负高度）
  const over = layout({ blocks: [{ k: 'a', h: 400 }, { k: 'zone', flex: true }, { k: 'b', h: 200 }] })
  assert.equal(over.avail, 492)
  assert.equal(over.zone, 0)
  assert.equal(over.fits, false)
  assert.equal(over.overflow, true)

  // 空参数也要能算（页面在极端情况下不至于炸）
  const empty = layout()
  assert.equal(empty.avail, 492)
  assert.equal(empty.zone, 492)
  assert.equal(empty.fits, true)

  // 自定义屏幕（老机型 390×450）：页面本身不溢出（卡片区可滚动），但一屏看全不了 4 行
  const small = layoutOf('Talents', { screen: { w: 390, h: 450 }, pad: { top: 10, bottom: 12 } })
  assert.equal(small.avail, 428)
  assert.equal(small.rows.want, 4)
  assert.equal(small.rows.visible, 3, '小屏一屏只能看全 3 行')
  assert.equal(small.rows.enough, false)
  assert.equal(small.fits, true, '装不下 4 行不等于页面溢出')

  // rows：一屏能完整看到几行 / 要滚几页
  const rows = layout({ blocks: [{ k: 'zone', flex: true }], rows: { h: 62, gap: 6, count: 5, want: 4 } })
  assert.equal(rows.rows.visible, 7)
  assert.equal(rows.rows.pages, 1)
  assert.equal(rows.rows.enough, true)
})

test('八个页面在 432×514 都装得下：逐页高度核算（本轮结果）', () => {
  // 修复前「抽词条」超屏；其余页面的滚动区高度也在这一轮统一算过（zone = 留给滚动区的剩余高度）
  const EXPECT = {
    Home: 404,      // 无滚动区，mid(flex) 拿走全部剩余；内容 202 → 上下留白 202
    Talents: 306,
    Alloc: 278,
    Life: 268,
    End: 146,
    Codex: 254,
    Archive: 182,
    About: 316
  }
  assert.deepEqual(PAGES.slice().sort(), Object.keys(EXPECT).sort(), '页面清单要与 manifest 的 8 页一致')
  for (const p of PAGES) {
    const l = layoutOf(p)
    assert.equal(l.avail, AVAIL_H, p + ' 的可用高度应为 492')
    assert.equal(l.used + l.zone, l.avail, p + '：占用 + 滚动区应正好等于可用高度')
    assert.equal(l.zone, EXPECT[p], p + ' 的滚动区高度与核算表不一致')
    assert.ok(l.zone > 0, p + ' 应有滚动区/弹性区')
    assert.equal(l.fits, true, p + ' 不该超出 514（固定块 + 间距 ≤ 492）')
    assert.equal(l.overflow, false, p)
    assert.equal(l.minOk, true, p + ' 的滚动区低于最低要求')
  }
})

test('回归证据：修复前「抽词条」的高度 505 > 492，底部按钮必然出屏', () => {
  const old = layout({
    blocks: [
      { k: 'topbar', h: 50 },
      { k: 'status', h: 34, gap: 2 },
      { k: 'grid', h: 275, gap: 2 },      // 5 行 × (50 + 5px 行距)
      { k: 'desc', h: 76, gap: 2 },       // min-height 60 + 上下 padding 16
      { k: 'btns', h: 64 }
    ]
  })
  assert.equal(old.used, 505)
  assert.equal(old.used > old.avail, true, '505 > 492：旧结构多出 13px，按钮被挤出屏幕')
  assert.equal(old.fits, false)
  assert.equal(old.overflow, true)
})

test('抽词条页：卡片高度按"一屏看全 4 行"设计，10 张卡滚动看完', () => {
  const t = layoutOf('Talents')
  assert.equal(t.blocks.topbar, 50)
  assert.equal(t.blocks.info, 30, '顶部信息行')
  assert.equal(t.blocks.summary, 28, '已选摘要（一行）')
  assert.equal(t.blocks.zone, 306, '卡片滚动区')
  assert.equal(t.blocks.btns, 64, '底部操作行')
  assert.equal(t.rows.h, 62)
  assert.equal(t.rows.rowH, 68)
  assert.equal(t.rows.visible, 4, '一屏完整看到 4 行')
  assert.equal(t.rows.enough, true)
  assert.equal(t.rows.pages, 2, '10 张卡 = 5 行，两页滚完')

  const four = 4 * t.rows.h + 3 * t.rows.gap   // 266
  const five = 5 * t.rows.h + 4 * t.rows.gap   // 334
  assert.ok(four <= t.zone, '4 行卡片要一屏看全：' + four + ' ≤ ' + t.zone)
  assert.ok(five > t.zone, '5 行卡片必须超出滚动区（否则不需要滚动）：' + five + ' > ' + t.zone)
})

test('抽词条页结构：顶部信息行固定 / 摘要一行 / 卡片唯一滚动 / 底部按钮在 scroll 之外', () => {
  const tpl = tplOf('src/pages/Talents/index.ux')
  const ranges = scrollRanges(tpl)
  assert.equal((tpl.match(/<scroll\b/g) || []).length, 1, '抽词条页只应有一个滚动区')
  assert.equal(ranges.length, 1)
  const s = ranges[0][0]
  const e = ranges[0][1]
  const inner = tpl.slice(s, e)

  // 三段固定的顺序：顶栏 → 信息行 → 已选摘要 → 卡片区（scroll）→ 底部操作行
  const order = ['class="topbar"', 'class="info"', 'class="summary"', 'class="scroll zone"', 'class="btn-row']
  let last = -1
  for (const k of order) {
    const at = tpl.indexOf(k)
    assert.ok(at > last, k + ' 的位置不对（应为 顶栏 → 信息行 → 已选摘要 → 卡片区 → 底部按钮）')
    last = at
  }

  // 卡片在滚动区里；换一批 / 下一步 在滚动区外
  assert.ok(inner.indexOf('class="tcard') >= 0, '卡片必须在滚动区里')
  assert.equal(inner.indexOf('class="btn'), -1, '底部按钮不能被滚动区包住')
  assert.ok(tpl.indexOf('class="btn-row') > e, '底部操作行必须在 </scroll> 之后')
  assert.equal(inner.indexOf('@click="redraw"'), -1, '换一批 不在滚动区')
  assert.equal(inner.indexOf('@click="next"'), -1, '下一步 不在滚动区')

  // 已选摘要只有一行；点词条的说明放进滚动区（不再在底部占一块）
  assert.equal((tpl.match(/\{\{pickedLine\}\}/g) || []).length, 1, '已选摘要只占一行')
  assert.ok(inner.indexOf('class="desc"') >= 0, '点词条的说明应在滚动区里')
  assert.ok(tpl.indexOf('{{descText}}') > s && tpl.indexOf('{{descText}}') < e)
  assert.equal(inner.indexOf('class="desc"') > inner.indexOf('class="grid"'), false, '说明在卡片之前')

  // 摘要一行放得下：字数上限 × 字号 ≤ 卡片区宽度（404）
  const page = read('src/pages/Talents/index.ux')
  const sumMax = Number((page.match(/SUMMARY_MAX\s*=\s*(\d+)/) || [])[1])
  const sumFont = Number((declOf(cssBlock(page, '.sum-t'), 'font-size') || '').replace('px', ''))
  assert.ok(sumMax > 0 && sumFont > 0, '摘要的上限与字号要能解析出来')
  assert.ok(sumMax * sumFont <= 404, '摘要一行必须放得下：' + sumMax + '×' + sumFont + ' ≤ 404')
  assert.equal(declOf(cssBlock(page, '.summary'), 'height'), '28px', '摘要行固定 28px')
})

test('全工程：任何页面的按钮/胶囊都不在滚动区内（底部操作始终可点）', () => {
  const expectBottom = {
    Talents: 'class="btn-row',
    Alloc: 'class="btn-row',
    Life: 'class="btn next',
    End: 'class="btn-row',
    Codex: 'class="pg-btn',
    Archive: 'class="slot-acts'
  }
  for (const p of PAGES) {
    const tpl = tplOf('src/pages/' + p + '/index.ux')
    const ranges = scrollRanges(tpl)
    let lastEnd = -1
    for (const r of ranges) {
      const inner = tpl.slice(r[0], r[1])
      const bad = inner.match(/class="[^"]*btn/)
      assert.ok(!bad, p + ' 页的滚动区里出现了按钮：' + (bad && bad[0]))
      if (r[1] > lastEnd) lastEnd = r[1]
    }
    if (expectBottom[p]) {
      assert.ok(tpl.lastIndexOf(expectBottom[p]) > lastEnd,
        p + ' 页的主操作必须在所有滚动区之后（固定在底部）')
    }
  }
})

test('全工程：圆角没有百分比写法；圆形/胶囊元素半径 = 直径一半', () => {
  // 1) 没有 border-radius: %（平台不生效会变方），且都写成 px
  for (const f of styleFiles(new URL('src/', ROOT))) {
    const text = fs.readFileSync(f, 'utf8')
    const re = /border-radius\s*:\s*([^;}\n]+)/g
    let m
    while ((m = re.exec(text))) {
      assert.equal(m[1].indexOf('%'), -1,
        f.pathname + ' 出现百分比圆角（会变方）：' + m[0].trim())
      assert.ok(/\d+px/.test(m[1]), f.pathname + ' 圆角应写成 px：' + m[0].trim())
    }
  }

  // 2) 圆形/胶囊（按钮、圆点、年代标记…）半径必须是直径的一半
  const round = [
    ['src/common/style/base.css', '.btn', 64, 32],
    ['src/pages/Home/index.ux', '.btn-hero', 76, 38],
    ['src/pages/Alloc/index.ux', '.step', 44, 22],
    ['src/pages/Alloc/index.ux', '.btn-sm', 52, 26],
    ['src/pages/Codex/index.ux', '.filter', 38, 19],
    ['src/pages/Codex/index.ux', '.pg-btn', 52, 26],
    ['src/pages/Archive/index.ux', '.sbtn', 46, 23],
    ['src/pages/End/index.ux', '.tag', 40, 20],
    ['src/pages/Life/index.ux', '.now-badge', 20, 10]   // 高 = 字号 18 + 上下 padding 1
  ]
  for (const item of round) {
    const block = cssBlock(read(item[0]), item[1])
    const h = Number(declOf(block, 'height').replace('px', ''))
    const r = declOf(block, 'border-radius')
    if (h > 0) assert.equal(h, item[2], item[0] + ' ' + item[1] + ' 的高度与表不一致')
    assert.equal(r, (item[3]) + 'px',
      item[0] + ' ' + item[1] + ' 的圆角应取直径一半 ' + item[3] + 'px，实际 ' + r)
  }
})

test('布局重排没有破坏"进页不装配内容池"：Talents 仍只用抽取结果', () => {
  // 抽词条页要用卡池，允许走 content-setup（页面内注入一次）；但不许直接 import 全量内容池
  const tal = read('src/pages/Talents/index.ux')
  assert.equal(tal.indexOf('content/index.js'), -1, 'Talents 不能直接 import 内容池')
  assert.equal(tal.indexOf('ALL_TALENTS'), -1, 'Talents 不该引用 ALL_TALENTS')
  assert.ok(tal.indexOf('drawTalents') >= 0, 'Talents 用 drawTalents 的抽取结果')
  assert.ok(tal.indexOf('content-setup.js') >= 0, 'Talents 仍通过 content-setup 注入卡池')

  // 只用存档/统计/预生成索引的页面不该装配内容池
  for (const p of ['Home', 'Alloc', 'Archive', 'About', 'Codex']) {
    const src = read('src/pages/' + p + '/index.ux')
    assert.equal(src.indexOf('content-setup.js'), -1, p + ' 页不该装配内容池')
    assert.equal(src.indexOf('content/index.js'), -1, p + ' 页不该 import 内容池')
  }
})

test('页面样式引用的高度与 layout() 的数字一致（不手写互相挤压的高度）', () => {
  const TABLE = [
    ['src/common/style/base.css', '.topbar', '50px'],
    ['src/common/style/base.css', '.btn', '64px'],
    ['src/pages/Home/index.ux', '.hero', '62px'],
    ['src/pages/Home/index.ux', '.foot', '26px'],
    ['src/pages/Home/index.ux', '.btn-hero', '76px'],
    ['src/pages/Talents/index.ux', '.info', '30px'],
    ['src/pages/Talents/index.ux', '.summary', '28px'],
    ['src/pages/Talents/index.ux', '.tcard', '62px'],
    ['src/pages/Talents/index.ux', '.desc', '52px'],
    ['src/pages/Alloc/index.ux', '.arow', '50px'],
    ['src/pages/Alloc/index.ux', '.btn-sm', '52px'],
    ['src/pages/Life/index.ux', '.realmline', '34px'],
    ['src/pages/Life/index.ux', '.pathline', '32px'],
    ['src/pages/End/index.ux', '.hero', '84px'],
    ['src/pages/End/index.ux', '.tags', '40px'],
    ['src/pages/End/index.ux', '.fact', '40px'],
    ['src/pages/Codex/index.ux', '.tab', '42px'],
    ['src/pages/Codex/index.ux', '.filter', '38px'],
    ['src/pages/Codex/index.ux', '.compl', '44px'],
    ['src/pages/Codex/index.ux', '.pager', '58px'],
    ['src/pages/Archive/index.ux', '.slot', '70px'],
    ['src/pages/Archive/index.ux', '.slots', '224px'],
    ['src/pages/Archive/index.ux', '.slot-sec', '30px'],
    ['src/pages/About/index.ux', '.srow', '54px']
  ]
  for (const row of TABLE) {
    assert.equal(declOf(cssBlock(read(row[0]), row[1]), 'height'), row[2],
      row[0] + ' ' + row[1] + ' 的高度应为 ' + row[2] + '（与 layout.js 的总账对齐）')
  }

  // 每个页面都要 import layoutOf 并把算出的高度绑到样式上
  for (const p of PAGES) {
    const src = read('src/pages/' + p + '/index.ux')
    assert.ok(src.indexOf("layoutOf('" + p + "')") >= 0, p + ' 页应 import layoutOf 并核算本页高度')
    assert.ok(/\{\{[A-Za-z]+H\}\}/.test(src), p + ' 页应把 layout 算出的高度绑到样式上')
  }
})

const failed = results.filter(r => !r.ok)
for (const r of results) console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name + (r.ok ? '' : '  -> ' + r.msg))
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' 通过')
if (failed.length) process.exit(1)
