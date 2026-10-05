/**
 * 应用级状态：当前人生存档 / 图鉴进度 / 设置 / 轻振动
 *
 * 重要（模拟器实测 2026-10-05，踩过的坑）：
 * 蓝河的打包器是"每个页面一份 bundle"，本模块会被**内联进每个页面**的字节码，
 * 页面各自执行一份——所以模块级对象**不是**跨页单例！
 * 之前的写法（页面 import 同一个模块对象当全局用）在模拟器上直接炸：
 * 抽词条页 setRun 写的是一份内存，分配属性页 onInit 读到的 app.run 是 null，
 * 于是立刻 replace 回首页，replace 打在正在创建的页面上 → 页面不可见 → 应用退出。
 *
 * 现在真正的状态放在 shared.js 找到的**应用级容器**里（this.$app.$def，退一步 globalThis），
 * 本对象只做门面：页面在 onInit/onShow 里先 attach(this) 把它接进来。
 * run / codexSeen 是对象，跨页共享引用；speedFast / vib / loaded 是标量，attach 时同步快照，
 * 由本模块的 setXxx / markCodex 等写回容器。
 */
import vibrator from '@blueos.hardware.vibrator.vibrator'
import { saveKey, loadKey, dropKey } from './util.js'
import {
  emptyCodex, serializeRun, isResumable, parseCodex, mergeCodex, codexCount,
  SLOT_IDS, SLOT_LABEL, slotKey, emptySlots, parseSlots, serializeLast, parseLast
} from './save.js'
import { stateOf } from './shared.js'

export const VERSION = '1.2.0'
export const SRC_VERSION = '2.3.3'
export const AUTHOR = '模糊二维码byxz'

// storage 键名沿用 lrgt_ 前缀；自动档仍是 lrgt_run（老存档升级后直接进自动档）
const KEY_SLOT = 'lrgt_slot'      // 当前选中的存档槽：'auto' / 's1' / 's2'
const KEY_LAST = 'lrgt_last'      // 最近一次结算的小记录（首页"最近结局"卡片）
const KEY_CODEX = 'lrgt_codex'    // 图鉴已解锁 {T,I,D,A,P}
const KEY_SPEED = 'lrgt_speed'    // 自动播放：'1' 快速 / '0' 正常
const KEY_VIB = 'lrgt_vib'        // 震动开关

/** 各槽位的 storage 键（首页/关于页要显示"存在哪个槽"时用得上） */
export const RUN_KEYS = SLOT_IDS.map(slotKey)

const app = {
  /* ---------------- 跨页共享状态的接入 ---------------- */

  s: null,          // 共享容器（同一应用唯一）
  _who: null,       // 最近一次 attach 的页面/app 实例

  // 以下是与容器同步的门面字段：页面直接读 app.run / app.codexSeen 即可
  run: null,                          // 当前选中槽位里的那一局
  slots: emptySlots(),                // { auto, s1, s2 } 三个槽位的 run 或 null
  slot: 'auto',                       // 当前选中的槽位
  last: null,                         // 最近一次结算记录（首页卡片）
  codexSeen: emptyCodex(),
  speedFast: false,
  vib: true,
  loaded: false,
  lastVib: 0,

  /**
   * 页面生命周期开头调用（onInit / onShow 都调，可重复）。
   * 第一次调用负责把存档读进来；之后只做同步。
   */
  attach(who) {
    if (who) this._who = who
    const s = stateOf(this._who)
    this.s = s
    if (!s.inited) {
      s.inited = true
      s.run = null
      s.slots = emptySlots()
      s.slot = 'auto'
      s.last = null
      s.codexSeen = emptyCodex()
      s.speedFast = false
      s.vib = true
      s.loaded = false
      this.load(s)
    }
    this.sync()
    return s
  },

  /** 把容器里的状态同步到本页门面（对象是引用，标量是快照） */
  sync() {
    const s = this.s
    if (!s) return
    if (!s.slots) s.slots = emptySlots()
    if (!s.slot) s.slot = 'auto'
    this.slots = s.slots
    this.slot = s.slot
    s.run = s.slots[s.slot] || null
    this.run = s.run
    this.last = s.last || null
    this.codexSeen = s.codexSeen
    this.speedFast = s.speedFast
    this.vib = s.vib
    this.loaded = s.loaded
  },

  /** 读存档：每个应用只跑一次（异步，读不到就用默认值） */
  load(s) {
    // 3 个槽（算作 1 次）+ 选中槽 + 最近结算 + 图鉴 + 速度 + 震动 = 6
    let n = 6
    const done = () => {
      if (--n <= 0) {
        s.run = s.slots[s.slot] || null
        s.loaded = true
        this.sync()
      }
    }
    // 三个槽各自异步返回，顺序不定：先原样收着，三个都回来再一次性解析
    const raw = {}
    let got = 0
    for (let i = 0; i < SLOT_IDS.length; i++) {
      const onOne = (id) => (ok, v) => {
        raw[id] = ok ? v : null
        got++
        if (got === SLOT_IDS.length) {
          s.slots = parseSlots(raw)
          done()
        }
      }
      loadKey(slotKey(SLOT_IDS[i]), onOne(SLOT_IDS[i]))
    }
    loadKey(KEY_SLOT, (ok, v) => {
      if (ok && (v === 's1' || v === 's2' || v === 'auto')) s.slot = v
      done()
    })
    loadKey(KEY_LAST, (ok, v) => { if (ok) s.last = parseLast(v); done() })
    loadKey(KEY_CODEX, (ok, v) => {
      if (ok && v) s.codexSeen = parseCodex(v)
      done()
    })
    loadKey(KEY_SPEED, (ok, v) => { s.speedFast = ok && v === '1'; done() })
    loadKey(KEY_VIB, (ok, v) => {
      s.vib = ok ? v === '1' : true
      done()
    })
  },

  /* ---------------- 当前这一局（按槽位读写） ---------------- */

  /** 把这一局放进当前（或指定）槽位并立刻写盘 */
  setRun(run, slot) {
    const id = (slot && SLOT_IDS.indexOf(slot) >= 0) ? slot : this.slot
    if (this.s) {
      if (!this.s.slots) this.s.slots = emptySlots()
      this.s.slots[id] = run
      this.s.slot = id
    }
    this.slots = this.s ? this.s.slots : this.slots
    this.slot = id
    this.run = run
    this.saveRun()
  },

  /** 自动存档：活着才写；这一局死了就把该槽的旧存档删掉，免得首页还能"续命" */
  saveRun() {
    const slot = this.slot || 'auto'
    const text = serializeRun(this.run)
    if (text === null) {
      if (this.run && this.run.started && !this.run.alive) {
        if (this.s && this.s.slots) this.s.slots[slot] = null
        this.slots[slot] = null
        dropKey(slotKey(slot), null)
      }
      return
    }
    try {
      saveKey(slotKey(slot), text, null)
    } catch (e) { /* 存档失败不影响玩 */ }
  },

  /** 清掉当前（或指定）槽位 */
  clearRun(slot) {
    const id = (slot && SLOT_IDS.indexOf(slot) >= 0) ? slot : (this.slot || 'auto')
    if (this.s && this.s.slots) this.s.slots[id] = null
    this.slots[id] = null
    if (id === this.slot) this.run = null
    dropKey(slotKey(id), null)
  },

  /** 切换选中槽位（首页三个卡片）；切完立刻把门面同步回来 */
  selectSlot(slot) {
    if (SLOT_IDS.indexOf(slot) < 0) return false
    if (this.s) {
      this.s.slot = slot
      if (!this.s.slots) this.s.slots = emptySlots()
      this.s.slot = slot
    }
    this.slot = slot
    this.run = (this.slots || {})[slot] || null
    try { saveKey(KEY_SLOT, slot, null) } catch (e) { /* 记不住就回到自动档，不影响玩 */ }
    return true
  },

  /** 首页用：有没有可以接着玩的一局（返回年龄，没有则 -1） */
  resumeAge() {
    return isResumable(this.run) ? this.run.age : -1
  },

  /** 首页用：三个槽位的一行摘要（槽位顺序固定 auto → s1 → s2） */
  slotList() {
    const out = []
    for (let i = 0; i < SLOT_IDS.length; i++) {
      const id = SLOT_IDS[i]
      const run = (this.slots || {})[id] || null
      out.push({
        id: id,
        label: SLOT_LABEL[id] || id,
        empty: !isResumable(run),
        age: isResumable(run) ? run.age : 0,
        talents: run && run.talents ? run.talents.length : 0,
        items: run && run.items ? run.items.length : 0,
        run: run
      })
    }
    return out
  },

  /* ---------------- 最近一次结算 ---------------- */

  setLast(rec) {
    const text = serializeLast(rec)
    if (!text) return
    const parsed = parseLast(text)
    if (!parsed) return
    if (this.s) this.s.last = parsed
    this.last = parsed
    try { saveKey(KEY_LAST, text, null) } catch (e) { /* 忽略 */ }
  },

  /* ---------------- 图鉴 ---------------- */

  codexCount() {
    return codexCount(this.codexSeen)
  },

  /** 把一局里见过的词条/物品/结局/成就/体系记进图鉴 */
  markCodex(run, endingId, achIds) {
    if (!run) return
    const paths = []
    if (run.path) paths.push(run.path.kind)
    if (run.path2) paths.push(run.path2.kind)
    const next = mergeCodex(this.codexSeen, {
      pathKinds: paths,
      talents: run.talents || [],
      items: run.items || [],
      ending: endingId,
      achievements: achIds || []
    })
    this.codexSeen = next
    if (this.s) this.s.codexSeen = next
    try { saveKey(KEY_CODEX, JSON.stringify(next), null) } catch (e) { /* 忽略 */ }
  },

  clearCodex() {
    const c = emptyCodex()
    this.codexSeen = c
    if (this.s) this.s.codexSeen = c
    try { saveKey(KEY_CODEX, JSON.stringify(c), null) } catch (e) { /* 忽略 */ }
  },

  /* ---------------- 设置 ---------------- */

  setSpeedFast(fast) {
    this.speedFast = !!fast
    if (this.s) this.s.speedFast = this.speedFast
    saveKey(KEY_SPEED, fast ? '1' : '0', null)
  },

  setVib(on) {
    this.vib = !!on
    if (this.s) this.s.vib = this.vib
    saveKey(KEY_VIB, on ? '1' : '0', null)
  },

  /** 轻振动（关掉时静默；80ms 节流，连点不每下都震） */
  tap() {
    if (!this.vib) return
    const now = Date.now()
    if (this.lastVib && now - this.lastVib < 80) return
    this.lastVib = now
    try { vibrator.vibrate({ mode: 'short' }) } catch (e) { /* 部分机型不支持，忽略 */ }
  }
}

export default app
