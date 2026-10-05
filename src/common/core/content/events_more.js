/**
 * 人生重开 · 修仙（vivo WATCH GT 2 移植版）
 * 内容扩充包 · 人生事件（第三批）
 *
 * id 段：W001 ~ W045（45 条），覆盖四个年龄段：
 *   幼年 [0,12] 10 条 / 青年 [13,30] 13 条 / 中年 [31,60] 13 条 / 晚年 [61,120] 9 条
 *
 * 结构要求（本批刻意覆盖）：
 *   · ≥8 条与四条体系联动：W005~W008 各给一条体系的"入门契机"，
 *     W019/W020/W021/W022 是四体系的成长期事件（req.path 限定），W035 是科技线物品事件；
 *   · ≥6 条触发物品：W004 / W010 / W012 / W013 / W014 / W026 / W029 / W035 / W039 / W044；
 *   · ≥4 条与结局挂钩：W025（保温杯 I101 → D066）、W036（library_keeper → D070）、
 *     W039（lamp_keeper → D069）、W040（late_bloomer_lived → D071）；
 *   · 文案 20~60 字，有梗有反差，避免流水账。
 *
 * schema 与 events_life.js 完全一致：age / weight / kind / req / eff，
 * once 缺省为 true（引擎默认每条只触发一次）。
 */
export const EVENTS = [
  /* ---------------- 幼年 [0,12] 10 条 ---------------- */
  {
    id: 'W001', title: '抢遥控器', text: '你和表哥为遥控器扭打成一团，最后谁也没看成动画片。',
    age: [4, 10], weight: 10, kind: 'life', eff: { eq: 1, hp: -1 }
  },
  {
    id: 'W002', title: '攒糖纸', text: '你把糖纸一张张夹进字典，说这是宝贝，谁来都不给看。',
    age: [5, 12], weight: 9, kind: 'life', eff: { luck: 1, flag: 'sugar_paper' }
  },
  {
    id: 'W003', title: '辣条管够', text: '你用一个月零花钱换了一书包辣条，第二天嗓子哑得说不出话。',
    age: [6, 12], weight: 9, kind: 'life', eff: { hp: -1, luck: 1 }
  },
  {
    id: 'W004', title: '河滩上的半块玉', text: '你在河滩摸到半块温玉，断口很齐，另一半不知在谁手里。',
    age: [6, 12], weight: 3, kind: 'item', req: { luck: 7 }, eff: { item: 'I028', luck: 1 }
  },
  {
    id: 'W005', title: '后院埋铁', text: '你从后院土里刨出一块锈铁，扛起来居然觉得顺手，就不肯撒手了。',
    age: [6, 12], weight: 1, kind: 'cultivate', req: { luck: 7 }, eff: { enterPath: 'body' }
  },
  {
    id: 'W006', title: '蜡烛听话', text: '你盯着蜡烛小声说了句"灭"，它真的灭了，你吓得一晚上没敢再说话。',
    age: [6, 12], weight: 1, kind: 'cultivate', req: { luck: 7 }, eff: { enterPath: 'magic' }
  },
  {
    id: 'W007', title: '拆钟的孩子', text: '你把家里的闹钟拆了又装回去，多出两颗螺丝，走时却更准了。',
    age: [7, 12], weight: 1, kind: 'cultivate', req: { luck: 7 }, eff: { enterPath: 'tech' }
  },
  {
    id: 'W008', title: '槐树洞里的册子', text: '你在老槐树的洞里掏出一本薄册子，笔画像虫爬，看久了竟有点困。',
    age: [6, 12], weight: 1, kind: 'cultivate', req: { luck: 7 }, eff: { enterPath: 'cultivate' }
  },
  {
    id: 'W009', title: '考了个零分', text: '你人生第一次考零分，把卷子折成纸飞机扔出了窗外，飞得特别远。',
    age: [7, 12], weight: 8, kind: 'danger', req: { lt: { iq: 5 } }, eff: { iq: -1, luck: 1 }
  },
  {
    id: 'W010', title: '被鸡追', text: '你捅了鸡窝，被一只母鸡追出二里地，全村都听见了你的哭声。',
    age: [4, 9], weight: 8, kind: 'life', eff: { hp: -1, eq: 1 }
  },

  /* ---------------- 青年 [13,30] 13 条 ---------------- */
  {
    id: 'W011', title: '志愿填错一位', text: '你把专业代码填错一位，开学才知道自己被"草业科学"录取了。',
    age: [17, 21], weight: 7, kind: 'danger', eff: { iq: 1, eq: -1, luck: -1 }
  },
  {
    id: 'W012', title: '旧货市场的口琴', text: '你在旧货市场花十块钱买了把口琴，吹了半宿，室友求你别吹了。',
    age: [16, 28], weight: 6, kind: 'item', eff: { item: 'I104', eq: 1 }
  },
  {
    id: 'W013', title: '二手跑鞋', text: '你买了双二手跑鞋开始夜跑，跑着跑着，鞋底平了，腿却硬了。',
    age: [16, 30], weight: 7, kind: 'item', eff: { item: 'I105', hp: 1 }
  },
  {
    id: 'W014', title: '地铁月票', text: '你办了张地铁月票，从此早高峰的每一张脸你都似曾相识。',
    age: [18, 30], weight: 7, kind: 'item', eff: { item: 'I103', luck: 1 }
  },
  {
    id: 'W015', title: '出租屋的第一顿饭', text: '你在十平米的出租屋煮了碗面，加了两个蛋，仪式感比味道隆重。',
    age: [18, 26], weight: 8, kind: 'life', eff: { eq: 1, hp: 1 }
  },
  {
    id: 'W016', title: '等通知', text: '面试官说回去等通知，你等来了三个月后的系统自动回复。',
    age: [20, 28], weight: 7, kind: 'danger', eff: { eq: -1, iq: 1 }
  },
  {
    id: 'W017', title: '加班到地铁停运', text: '你加完班发现末班车早走了，打车费比这一天的加班费还贵。',
    age: [22, 35], weight: 8, kind: 'item', req: { hp: 10 }, eff: { item: 'I106', hp: -1, luck: -1 }
  },
  {
    id: 'W018', title: '相亲角', text: '你妈把你的照片摆进公园相亲角，备注写着"有房有车，性格好"。',
    age: [24, 36], weight: 7, kind: 'life', req: { eq: 8 }, eff: { eq: 1, luck: -1 }
  },
  {
    id: 'W019', title: '隔壁工位的老师傅', text: '隔壁工位的老师傅退休前把一叠手写笔记塞给你，说别外传。',
    age: [20, 32], weight: 5, kind: 'item', req: { path: 'tech' }, eff: { item: 'I107', progress: 20 }
  },
  {
    id: 'W020', title: '纸全飞了', text: '你打了个喷嚏，桌上的纸全飞了起来，你假装没看见，默默按住。',
    age: [16, 30], weight: 6, kind: 'cultivate', req: { path: 'magic' }, eff: { progress: 15, sp: 1 }
  },
  {
    id: 'W021', title: '一拳碎青石', text: '你对着院里的青石打了一拳，石头裂了，指骨也裂了，你说值。',
    age: [16, 30], weight: 6, kind: 'cultivate', req: { path: 'body', hp: 10 }, eff: { progress: 14, hp: -1 }
  },
  {
    id: 'W022', title: '分你半块灵石', text: '山道上遇到个散修，他分了你半块灵石，说看你顺眼，别问为什么。',
    age: [16, 30], weight: 6, kind: 'cultivate', req: { path: 'cultivate' }, eff: { progress: 15, eq: 1 }
  },
  {
    id: 'W023', title: '等了半天系统提示', text: '你盯着屏幕等系统提示音，等到的是手机欠费短信，也算提示。',
    age: [15, 28], weight: 6, kind: 'life', eff: { iq: 1, luck: -1 }
  },

  /* ---------------- 中年 [31,60] 13 条 ---------------- */
  {
    id: 'W024', title: '体检报告', text: '报告上多了三行箭头，你决定从明天开始跑步——明天一直没来。',
    age: [34, 55], weight: 8, kind: 'danger', eff: { hp: -1, eq: -1 }
  },
  {
    id: 'W025', title: '保温杯', text: '你在抽屉里塞满枸杞和保温杯，同事笑你养生，你说这叫未雨绸缪。',
    age: [33, 55], weight: 7, kind: 'item', eff: { item: 'I101', hp: 1 }
  },
  {
    id: 'W026', title: '工位绿萝', text: '你在工位养了盆绿萝，它长势惊人，你怀疑它吸的是你的精气。',
    age: [30, 55], weight: 7, kind: 'item', eff: { item: 'I102', hp: -1, eq: 1 }
  },
  {
    id: 'W027', title: '陪写作业', text: '你陪孩子写作业写到血压上升，最后是孩子反过来劝你冷静。',
    age: [33, 50], weight: 8, kind: 'life', eff: { eq: -1, iq: 1 }
  },
  {
    id: 'W028', title: '同学群活了', text: '沉寂多年的同学群突然热闹，话题从理想变成了体检指标。',
    age: [33, 55], weight: 7, kind: 'life', eff: { eq: 1, hp: -1 }
  },
  {
    id: 'W029', title: '老家来电', text: '老家来电话说房顶漏雨，你连夜买票回去，爬梯子比年轻时还利索。',
    age: [33, 60], weight: 7, kind: 'life', eff: { eq: -1, hp: 1 }
  },
  {
    id: 'W030', title: '副业烤肠', text: '你下班后摆摊卖烤肠，第一个月赚了三百块，也瘦了五斤。',
    age: [30, 52], weight: 6, kind: 'life', req: { hp: 9 }, eff: { luck: 1, hp: -1 }
  },
  {
    id: 'W031', title: '被叫老师', text: '新来的实习生叫你老师，你愣了三秒才应声，回家照着镜子看了很久。',
    age: [38, 55], weight: 7, kind: 'life', req: { eq: 10 }, eff: { eq: 1, iq: 1 }
  },
  {
    id: 'W032', title: '前同事入股', text: '前同事拉你入股，你投进去半年工资，他连人带项目一起消失了。',
    age: [32, 55], weight: 6, kind: 'danger', eff: { luck: -1, eq: -1 }
  },
  {
    id: 'W033', title: '孩子摔门', text: '孩子撂下一句"你不懂"就摔门走了，你在楼下站到路灯亮起。',
    age: [36, 55], weight: 7, kind: 'life', eff: { eq: -1 }
  },
  {
    id: 'W034', title: '二手吉他', text: '你买了把二手吉他，练了三个月只会四个和弦，但每晚都弹。',
    age: [38, 60], weight: 6, kind: 'life', eff: { eq: 1 }
  },
  {
    id: 'W035', title: '量子算盘', text: '你在实验室角落翻出一把老算盘，拨了两下，答案自己浮现在脑子里。',
    age: [30, 60], weight: 3, kind: 'item', req: { path: 'tech', iq: 10 }, eff: { item: 'I109', iq: 1 }
  },
  {
    id: 'W036', title: '藏书楼', text: '你把攒了半辈子的书全捐给社区，他们说要把那间屋以你命名。',
    age: [40, 70], weight: 5, kind: 'life', req: { iq: 10 }, eff: { flag: 'library_keeper', iq: 1 }
  },

  /* ---------------- 晚年 [61,120] 9 条 ---------------- */
  {
    id: 'W037', title: '早市', text: '你六点去早市，为一斤青菜和摊主讲了五分钟价，最后各自让步一毛。',
    age: [61, 92], weight: 8, kind: 'life', eff: { hp: 1, eq: 1 }
  },
  {
    id: 'W038', title: '没下完的棋', text: '老友的棋局摆到一半人就走了，你替他把最后一步走完，收好棋子。',
    age: [65, 98], weight: 7, kind: 'life', eff: { eq: -1, iq: 1 }
  },
  {
    id: 'W039', title: '旧货市场的铜灯', text: '你买下一盏旧铜灯，夜里擦拭时灯芯自己亮了，你决定留着它。',
    age: [55, 100], weight: 3, kind: 'item', req: { luck: 8 }, eff: { item: 'I108', flag: 'lamp_keeper' }
  },
  {
    id: 'W040', title: '晚成之志', text: '四十多岁你才认真做起一件事，身边人都说太晚，你没接话。',
    age: [42, 66], weight: 5, kind: 'life', req: { lt: { iq: 13 } }, eff: { flag: 'late_bloomer_lived', iq: 1, luck: 1 }
  },
  {
    id: 'W041', title: '重孙的问题', text: '重孙问你年轻时最厉害的事，你想了半天，说：我养活了一家人。',
    age: [70, 112], weight: 8, kind: 'life', eff: { eq: 2 }
  },
  {
    id: 'W042', title: '公园长椅', text: '你每天在同一张长椅坐一小时，看别人遛狗，狗都认得你了。',
    age: [61, 95], weight: 8, kind: 'life', eff: { hp: 1, eq: 1 }
  },
  {
    id: 'W043', title: '院子里种菜', text: '你把阳台改成菜地，第一茬小葱长出来那天，你拍照发了全家群。',
    age: [61, 95], weight: 8, kind: 'life', eff: { hp: 1, eq: 1 }
  },
  {
    id: 'W044', title: '还魂哨', text: '收拾老物件时你翻出一枚旧哨，吹响的那刻，胸口忽然暖了一下。',
    age: [80, 118], weight: 2, kind: 'item', req: { luck: 12 }, eff: { item: 'I110', hp: 1 }
  },
  {
    id: 'W045', title: '老照片翻新', text: '你让孙子把泛黄的老照片修好，照片上的人一个个年轻回来，又一个个走远。',
    age: [68, 110], weight: 7, kind: 'life', eff: { eq: 1, iq: 1 }
  }
]
