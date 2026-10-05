/**
 * 人生重开 · 修仙（vivo WATCH GT 2 移植版）
 * 内容扩充包 · 结局（第三批）
 *
 * id 段：D066 ~ D073（8 条，其中 2 条高难隐藏）
 * rank 沿用 1 平凡 / 2 优秀 / 3 稀有 / 4 史诗 / 5 传说。
 *
 * 挂钩方式（只用现有 req schema，不加新玩法）：
 *   · D066 靠物品 I101（新事件「保温杯」获得）
 *   · D067 靠 flag corporate_slave（既有"大厂螺丝钉"事件）
 *   · D068 靠 dualPath + flag cross_path_master（既有"大道相济"事件，与成就 A062 同源）
 *   · D069 靠物品 I108 + flag lamp_keeper（新事件「灯」）
 *   · D070 靠 flag library_keeper（新事件「藏书楼」）
 *   · D071 靠 flag late_bloomer_lived（新事件「晚成之志」）
 *   · D072 / D073 是高难隐藏：同时要求"成就级"前置 flag + 高属性 + 高龄，
 *     正常一局很难全凑齐，属于给长线玩家的目标。
 *
 * 池内次序：本批 8 条在 content/index.js 里被 concat 到 endings 池的最前面。
 * 原因：engine.resolveEnding 只在"rank 更高"时替换，同 rank 是先匹配到的胜出。
 * 新结局条件都很具体（物品 / flag / 双修 / 高境界），如果排在通用结局后面，
 * 会被更早的通用条目抢先匹配，等于永远抽不到。要注意 rank 仍然优先——
 * 例如任一 rank 5 的通用结局命中时，rank 2~4 的新结局不会顶掉它。
 */
export const ENDINGS = [
  {
    id: 'D066', name: '保温杯养生家', rank: 2,
    desc: '枸杞泡到发白，你终于活成了自己年轻时笑话的样子。',
    req: { items: ['I101'], ageMin: 65 }
  },
  {
    id: 'D067', name: '打工魂', rank: 2,
    desc: '工牌换了十几张，最后那张上面写着"感谢陪伴"。',
    req: { flags: ['corporate_slave'], ageMin: 45 }
  },
  {
    id: 'D068', name: '双修大成', rank: 4,
    desc: '两条路在你身上拧成一股绳，谁也说不清你算哪一门。',
    req: { dualPath: true, flags: ['cross_path_master'] }
  },
  {
    id: 'D069', name: '灯传千年', rank: 4,
    desc: '那盏灯亮了一千年，照过你，也照着后来的人。',
    req: { items: ['I108'], flags: ['lamp_keeper'], ageMin: 200 }
  },
  {
    id: 'D070', name: '藏书楼主人', rank: 3,
    desc: '你攒下的书比家当多，最后它们有了自己的屋子。',
    req: { flags: ['library_keeper'], iq: 12, ageMin: 60 }
  },
  {
    id: 'D071', name: '晚成之器', rank: 3,
    desc: '别人开花的时候你在扎根，等你开花时，花期格外长。',
    req: { flags: ['late_bloomer_lived'], ageMin: 80 }
  },
  {
    id: 'D072', name: '万法归一', rank: 5,
    desc: '你把两条路写成了一本书，翻到最后一页，只有两个字：不必。',
    req: { dualPath: true, flags: ['two_paths_legend', 'founded_school'], iq: 16, luck: 14, ageMin: 300 }
  },
  {
    id: 'D073', name: '与天对弈', rank: 5,
    desc: '你把寿数、劫数与命数都摆上棋盘，然后落了子。',
    req: { path: 'cultivate', pathLevel: 16, flags: ['tribulation_x3', 'defied_fate'], luck: 15 }
  }
]
