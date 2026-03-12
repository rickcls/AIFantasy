export const ORIGINS = [
  {
    id: "寒門孤兒",
    summary: "在饑荒與冷眼中活下來，對資源與承諾格外敏銳。",
    modifiers: { spiritStones: 12, luck: 6, daoHeart: 4, reputation: -4 },
    biography: "出身寒門，幼年流離，知世道冷暖。",
  },
  {
    id: "世家子弟",
    summary: "背負門庭期待，起點優渥，卻也容易牽動宗族利益。",
    modifiers: { spiritStones: 34, reputation: 8, contribution: 6, affinityMaster: -2 },
    biography: "承著家族名望而來，舉止之間自有世家習氣。",
  },
  {
    id: "山村藥童",
    summary: "熟識草木氣息，對丹藥與靈植格外敏感。",
    modifiers: { herbs: 3, pills: 1, vitality: 6, divineSense: 4 },
    biography: "曾在山村藥廬辨草熬湯，對藥香有天生熟悉。",
  },
  {
    id: "滅門遺孤",
    summary: "血仇未雪，心中有缺口，也比旁人更懂戒備。",
    modifiers: { vitality: 8, daoHeart: -4, demonicIntent: 8, grudgeRival: 6 },
    biography: "族門盡滅於一夜，自此只剩斷劍與殘夢相伴。",
  },
  {
    id: "妖族混血",
    summary: "氣息特殊，常受旁人猜疑，卻更容易與靈獸共鳴。",
    modifiers: { spiritualPower: 8, luck: 4, reputation: -8, beastAffinity: 14 },
    biography: "體內流著異族之血，既是機緣，也是行走世間的負擔。",
  },
];

export const ROOTS = [
  {
    id: "五靈根",
    summary: "根基駁雜但穩健，前期平庸，後期靠心性補足。",
    trainingRate: 0.92,
    modifiers: { daoHeart: 4, spiritualPower: -4 },
  },
  {
    id: "雙靈根",
    summary: "修行效率穩定，最適合首版平衡路線。",
    trainingRate: 1.08,
    modifiers: { spiritualPower: 6, vitality: 4 },
  },
  {
    id: "單靈根",
    summary: "根骨清明，修行順遂，突破更容易成功。",
    trainingRate: 1.16,
    modifiers: { spiritualPower: 10, divineSense: 4 },
  },
  {
    id: "異靈根",
    summary: "天賦驚人而偏鋒，常引來長老與敵手注目。",
    trainingRate: 1.22,
    modifiers: { spiritualPower: 12, reputation: 4, demonicIntent: 4 },
  },
  {
    id: "殘缺靈根",
    summary: "修行艱難卻最能磨鍊心志，常激發偏門奇遇。",
    trainingRate: 0.82,
    modifiers: { daoHeart: 10, luck: 8, vitality: -4 },
  },
];

export const PERSONALITIES = [
  {
    id: "謹慎",
    summary: "遇事先求穩妥，減少失手，卻可能錯過鋒芒。",
    pathBias: { 正道: 2, 逍遙道: 1 },
    modifiers: { daoHeart: 6, luck: 2 },
  },
  {
    id: "狂傲",
    summary: "寧折不彎，善於強攻，容易結仇。",
    pathBias: { 霸道: 2, 魔道: 1 },
    modifiers: { reputation: 4, vitality: 4, demonicIntent: 4 },
  },
  {
    id: "重情",
    summary: "與人牽繫深，關係回饋豐富，也更易生心魔。",
    pathBias: { 正道: 1, 逍遙道: 1 },
    modifiers: { daoHeart: 3, affinitySenior: 6, trustMortal: 8 },
  },
  {
    id: "無情",
    summary: "斷念求道，決斷果絕，但人情路會變窄。",
    pathBias: { 無情道: 3 },
    modifiers: { divineSense: 8, reputation: -4 },
  },
  {
    id: "利己",
    summary: "善算得失，資源增長快，因果負擔也更重。",
    pathBias: { 霸道: 1, 魔道: 1 },
    modifiers: { spiritStones: 10, demonicIntent: 4, karma: -4 },
  },
  {
    id: "正直",
    summary: "守信重諾，易得善緣，在亂世中亦更顯艱難。",
    pathBias: { 正道: 3 },
    modifiers: { reputation: 8, daoHeart: 4, luck: 2 },
  },
];

export const DESTINIES = [
  {
    id: "天命之子",
    summary: "高光與劫數並行，重大事件更容易圍繞你展開。",
    modifiers: { luck: 10, reputation: 6 },
  },
  {
    id: "殺劫纏身",
    summary: "災厄與衝突總會尋來，若能活下去，戰力成長極快。",
    modifiers: { vitality: 8, demonicIntent: 8, reputation: -4 },
  },
  {
    id: "丹道奇才",
    summary: "與丹藥相性極佳，煉藥、服藥與突破成本降低。",
    modifiers: { pills: 2, herbs: 2, contribution: 4 },
  },
  {
    id: "桃花劫重",
    summary: "情緣與糾葛易至，關係線更豐富，也更易亂心。",
    modifiers: { affinitySenior: 8, affinityMerchant: 4, daoHeart: -2 },
  },
  {
    id: "逢凶化吉",
    summary: "凡逢危局，總有一線轉機，奇遇與保命概率上升。",
    modifiers: { luck: 12, vitality: 6 },
  },
];

export const REALMS = [
  { id: "練氣", threshold: 0, nextThreshold: 120, lifespanBonus: 0 },
  { id: "築基", threshold: 120, nextThreshold: 280, lifespanBonus: 40 },
  { id: "金丹", threshold: 280, nextThreshold: 520, lifespanBonus: 80 },
  { id: "元嬰", threshold: 520, nextThreshold: 860, lifespanBonus: 140 },
  { id: "化神", threshold: 860, nextThreshold: 1100, lifespanBonus: 240 },
];

export const CHAPTERS = [
  "凡塵初啟",
  "入門修行",
  "爭鋒與機緣",
  "劫與變",
  "亂世開端",
  "問道之巔",
];

export const LOCATIONS = [
  {
    id: "凡塵鎮",
    risk: "低",
    summary: "凡人市集與香火巷弄交錯，是你回望初心與因果回收的地方。",
  },
  {
    id: "青雲宗",
    risk: "中",
    summary: "門規森嚴，資源豐厚，是首版最重要的成長容器。",
  },
  {
    id: "落月山脈",
    risk: "中",
    summary: "靈草、妖獸與殘破洞府並存，奇遇與風險皆不算低。",
  },
  {
    id: "黑風谷",
    risk: "高",
    summary: "魔修、盜匪與煞氣聚散之地，適合高風險掠奪與試膽。",
  },
  {
    id: "萬寶坊市",
    risk: "中",
    summary: "消息與交易在此流轉，許多劇情入口都可從這裡買來。",
  },
  {
    id: "古修洞府",
    risk: "高",
    summary: "傳承與禁制並存，需要實力、福緣與抉擇才能帶走真正的東西。",
  },
];

export const DAO_PATHS = [
  {
    id: "正道",
    summary: "守信護人，善緣與宗門支持較多。",
  },
  {
    id: "霸道",
    summary: "以勢壓人，資源回收快，敵手也會來得更快。",
  },
  {
    id: "魔道",
    summary: "以代價換力量，短期強勢，長期易遭因果與天劫反噬。",
  },
  {
    id: "無情道",
    summary: "斷念求真，心神凝練，但關係線往往趨於疏離。",
  },
  {
    id: "逍遙道",
    summary: "不戀宗門與權位，重機緣、重自在，變數最多。",
  },
];

export const CODEX_SECTIONS = [
  {
    id: "宗旨",
    title: "設計落點",
    copy:
      "本原型採用規則引擎先行、敘事模板包裝的方式，先證明世界狀態、選擇回饋與長線成長能穩定運作，再為後續 AI 文案層留接口。",
  },
  {
    id: "境界",
    title: "境界梯度",
    copy:
      "練氣、築基、金丹、元嬰、化神五大境界都已接入核心數值、突破條件與終局判定。突破不只是加數值，也會牽動壽元、因果與傳記。",
  },
  {
    id: "道途",
    title: "道途傾向",
    copy:
      "正道、霸道、魔道、無情道、逍遙道都用分數累積，並依最高值即時決定當前道途。這讓玩家能透過行動而非開局鎖死路線。",
  },
  {
    id: "地點",
    title: "首版地點",
    copy:
      "凡塵鎮、青雲宗、落月山脈、黑風谷、萬寶坊市與古修洞府都具備自己的事件池與風險調性，探索採用地點進入加事件抽取的 storylet 架構。",
  },
];

export const NPCS = [
  {
    id: "master",
    name: "蘇清衡",
    role: "師尊",
    intro: "青雲宗執劍長老，言語寡淡，卻極重承諾。",
  },
  {
    id: "senior",
    name: "林秋漪",
    role: "同門師姐",
    intro: "擅丹道與陣法，性情溫潤，看人卻極準。",
  },
  {
    id: "rival",
    name: "顧長夜",
    role: "宿敵",
    intro: "外門出身的劍修，心氣極高，總想壓你一頭。",
  },
  {
    id: "merchant",
    name: "沈萬錢",
    role: "商會盟友",
    intro: "萬寶坊市掌櫃，笑意滿面，消息和價格都不乾淨。",
  },
  {
    id: "mortal",
    name: "阿寧",
    role: "凡塵牽掛",
    intro: "曾在你最窮困時分你半碗熱粥的人。",
  },
  {
    id: "elder",
    name: "韓玄峰",
    role: "長老派系",
    intro: "懲戒堂出身，眼中容不得半點失序。",
  },
  {
    id: "fiend",
    name: "寧紅燼",
    role: "魔修",
    intro: "黑風谷行走的血焰修士，總像在等你失手一次。",
  },
  {
    id: "beast",
    name: "霜羽",
    role: "妖獸夥伴",
    intro: "雪羽靈禽，對善意與殺機都異常敏感。",
  },
  {
    id: "disciple",
    name: "謝小河",
    role: "徒弟",
    intro: "福緣薄卻眼神極亮的少年，總想跟著你學劍。",
  },
];

export const QUICK_START_PROFILE = {
  name: "沈問塵",
  origin: "山村藥童",
  root: "雙靈根",
  personality: "重情",
  destiny: "逢凶化吉",
};
