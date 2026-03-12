import {
  CHAPTERS,
  CODEX_SECTIONS,
  DAO_PATHS,
  DESTINIES,
  LOCATIONS,
  NPCS,
  ORIGINS,
  PERSONALITIES,
  QUICK_START_PROFILE,
  REALMS,
  ROOTS,
} from "./game-data.js";

import { buildContext, generateSceneText } from "./ai-service.js";

export const STORAGE_KEY = "fanchen-wendao-saves-v1";
export const MANUAL_SAVE_SLOTS = ["slot-1", "slot-2", "slot-3"];
export const AUTOSAVE_SLOT = "autosave";

const BASE_LOCATIONS = ["凡塵鎮", "青雲宗", "落月山脈"];
const NAME_PREFIX = ["沈", "林", "蘇", "顧", "韓", "葉", "白", "許", "雲", "楚"];
const NAME_SUFFIX = ["問塵", "清河", "寒松", "照夜", "明嵐", "青璃", "長風", "無咎", "行止", "知微"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextSeed(seed) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function roll(state) {
  state.seed = nextSeed(state.seed);
  return (state.seed >>> 0) / 4294967296;
}

function randomBetween(state, min, max) {
  return Math.floor(roll(state) * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function findById(collection, id) {
  return collection.find((entry) => entry.id === id);
}

function originData(state) {
  return findById(ORIGINS, state.profile.origin);
}

function rootData(state) {
  return findById(ROOTS, state.profile.root);
}

function personalityData(state) {
  return findById(PERSONALITIES, state.profile.personality);
}

function destinyData(state) {
  return findById(DESTINIES, state.profile.destiny);
}

function defaultRelationshipTemplate(npc) {
  return {
    id: npc.id,
    name: npc.name,
    role: npc.role,
    intro: npc.intro,
    unlocked: ["master", "senior", "rival", "mortal"].includes(npc.id),
    affinity: npc.id === "master" ? 10 : npc.id === "mortal" ? 18 : 0,
    trust: npc.id === "master" ? 12 : npc.id === "mortal" ? 14 : 0,
    bond: npc.id === "mortal" ? 10 : 0,
    grudge: npc.id === "rival" ? 10 : 0,
    alive: true,
  };
}

function createInitialRelationships(profile) {
  const relations = {};
  for (const npc of NPCS) {
    relations[npc.id] = defaultRelationshipTemplate(npc);
  }
  if (profile.personality === "重情") {
    relations.senior.affinity += 6;
    relations.mortal.bond += 8;
  }
  if (profile.origin === "滅門遺孤") {
    relations.rival.grudge += 6;
  }
  if (profile.destiny === "桃花劫重") {
    relations.senior.affinity += 8;
    relations.merchant.affinity += 4;
    relations.merchant.unlocked = true;
  }
  return relations;
}

function createPathScores(profile) {
  const scores = {
    正道: 0,
    霸道: 0,
    魔道: 0,
    無情道: 0,
    逍遙道: 0,
  };
  const personality = findById(PERSONALITIES, profile.personality);
  for (const [path, value] of Object.entries(personality.pathBias || {})) {
    scores[path] += value;
  }
  if (profile.origin === "寒門孤兒") {
    scores.逍遙道 += 1;
  }
  if (profile.origin === "滅門遺孤") {
    scores.霸道 += 1;
    scores.魔道 += 1;
  }
  if (profile.personality === "正直") {
    scores.正道 += 2;
  }
  return scores;
}

function deriveDaoPath(state) {
  let best = "正道";
  let bestScore = -Infinity;
  for (const path of DAO_PATHS) {
    const score = state.pathScores[path.id];
    if (score > bestScore) {
      best = path.id;
      bestScore = score;
    }
  }
  return best;
}

function itemDetails(name, type, quality, effect) {
  return { name, type, quality, effect };
}

function createInitialInventory(profile) {
  const items = [
    itemDetails("舊木劍", "法寶", "凡品", "初學者練劍之用，略增衝突勝率。"),
    itemDetails("入門吐納訣", "功法", "凡品", "基礎修行功法，穩定增加修為。"),
  ];
  if (profile.origin === "山村藥童") {
    items.push(itemDetails("青瓷藥匣", "玉簡", "凡品", "收納靈草時可略減損耗。"));
  }
  if (profile.origin === "世家子弟") {
    items.push(itemDetails("家傳護身玉", "法寶", "黃階", "危急時可化去一部分傷勢。"));
  }
  return items;
}

function createBiography(profile) {
  return [
    `第 1 年：${findById(ORIGINS, profile.origin).biography}`,
    `第 1 年：你以 ${profile.root} 之資踏入修行之門，心性偏向 ${profile.personality}。`,
    `第 1 年：命格為「${profile.destiny}」，命途自此不與凡俗同流。`,
  ];
}

function createBaseState(profile, seed) {
  const root = findById(ROOTS, profile.root);
  const state = {
    version: 1,
    seed,
    profile: clone(profile),
    storyPhase: "prologue",
    world: {
      turn: 0,
      month: 0,
      chapter: 1,
      location: "凡塵鎮",
      accessibleLocations: [...BASE_LOCATIONS],
      sectName: "青雲宗",
      sectRank: "外門弟子",
      factionStanding: "中立",
    },
    stats: {
      age: 16,
      realmIndex: 0,
      cultivation: 28,
      vitality: 100,
      spiritualPower: 72,
      divineSense: 36,
      daoHeart: 56,
      luck: 50,
      karma: 0,
      reputation: 8,
      demonicIntent: 4,
      lifespan: 118,
    },
    resources: {
      spiritStones: 28,
      pills: 1,
      herbs: 1,
      materials: 1,
      contribution: 12,
    },
    inventory: createInitialInventory(profile),
    pathScores: createPathScores(profile),
    daoPath: "正道",
    relationships: createInitialRelationships(profile),
    memories: [],
    biography: createBiography(profile),
    flags: {
      prologueChoice: null,
      rainyNightResolved: false,
      remnantPageFound: false,
      caveUnlocked: false,
      marketUnlocked: false,
      beastBonded: false,
      acceptedDisciple: false,
      rescuedVillagers: false,
      bloodRealmSeen: false,
      sectCrisisResolved: false,
      thunderTempered: false,
      manualBorrowed: false,
      allianceWithMerchant: false,
    },
    cooldowns: {},
    eventCounts: {},
    recentOutcome: "命盤初定，前路尚未展開。",
  };

  const modifierGroups = [
    findById(ORIGINS, profile.origin).modifiers || {},
    findById(ROOTS, profile.root).modifiers || {},
    findById(PERSONALITIES, profile.personality).modifiers || {},
    findById(DESTINIES, profile.destiny).modifiers || {},
  ];
  for (const modifiers of modifierGroups) {
    applyProfileModifiers(state, modifiers);
  }
  state.stats.cultivation = Math.round(state.stats.cultivation * root.trainingRate);
  state.daoPath = deriveDaoPath(state);
  pushMemory(state, `你帶著 ${profile.origin} 的過往，準備踏入修行界。`);
  refreshDerivedState(state);
  return state;
}

function applyProfileModifiers(state, modifiers) {
  for (const [key, value] of Object.entries(modifiers)) {
    if (key in state.stats) {
      state.stats[key] += value;
      continue;
    }
    if (key in state.resources) {
      state.resources[key] += value;
      continue;
    }
    if (key === "affinityMaster") {
      state.relationships.master.affinity += value;
      continue;
    }
    if (key === "affinitySenior") {
      state.relationships.senior.affinity += value;
      continue;
    }
    if (key === "affinityMerchant") {
      state.relationships.merchant.affinity += value;
      state.relationships.merchant.unlocked = true;
      continue;
    }
    if (key === "trustMortal") {
      state.relationships.mortal.trust += value;
      continue;
    }
    if (key === "grudgeRival") {
      state.relationships.rival.grudge += value;
      continue;
    }
    if (key === "beastAffinity") {
      state.relationships.beast.affinity += value;
      continue;
    }
  }
}

function pushMemory(state, text) {
  state.memories.unshift(text);
  state.memories = state.memories.slice(0, 8);
}

function addBiography(state, text) {
  const yearText = `第 ${currentYear(state)} 年`;
  state.biography.unshift(`${yearText}：${text}`);
  state.biography = state.biography.slice(0, 20);
}

function currentYear(state) {
  return Math.floor(state.world.month / 12) + 1;
}

function formatAge(state) {
  const years = Math.floor(state.stats.age);
  const months = Math.round((state.stats.age - years) * 12);
  return months === 0 ? `${years} 歲` : `${years} 歲 ${months} 月`;
}

function setCooldown(state, eventId, turns) {
  state.cooldowns[eventId] = state.world.turn + turns;
}

function onCooldown(state, eventId) {
  return (state.cooldowns[eventId] || 0) > state.world.turn;
}

function incrementEventCount(state, eventId) {
  state.eventCounts[eventId] = (state.eventCounts[eventId] || 0) + 1;
}

function relation(state, id) {
  return state.relationships[id];
}

function adjustRelationship(state, id, updates) {
  const target = state.relationships[id];
  if (!target) return;
  target.unlocked = true;
  for (const [key, value] of Object.entries(updates)) {
    if (key in target && typeof target[key] === "number") {
      target[key] = clamp(target[key] + value, -100, 160);
    } else if (key === "alive") {
      target.alive = value;
    } else if (key === "unlocked") {
      target.unlocked = value;
    }
  }
}

function addPathInfluence(state, updates) {
  for (const [path, value] of Object.entries(updates)) {
    state.pathScores[path] += value;
  }
  state.daoPath = deriveDaoPath(state);
}

function addItem(state, item) {
  if (state.inventory.some((entry) => entry.name === item.name)) return;
  state.inventory.push(item);
}

function removeItem(state, name) {
  state.inventory = state.inventory.filter((entry) => entry.name !== name);
}

function changeLocation(state, locationId) {
  if (!state.world.accessibleLocations.includes(locationId)) {
    state.world.accessibleLocations.push(locationId);
  }
  state.world.location = locationId;
}

function advanceTime(state, months) {
  state.world.month += months;
  state.world.turn += 1;
  state.stats.age += months / 12;
  state.stats.vitality = clamp(state.stats.vitality, 0, 130);
  refreshDerivedState(state);
}

function trainingRate(state) {
  return rootData(state).trainingRate;
}

function realmData(state) {
  return REALMS[state.stats.realmIndex];
}

function nextRealm(state) {
  return REALMS[state.stats.realmIndex + 1] || null;
}

function isBreakthroughReady(state) {
  const realm = realmData(state);
  return Boolean(nextRealm(state) && state.stats.cultivation >= realm.nextThreshold);
}

function refreshDerivedState(state) {
  state.stats.vitality = clamp(state.stats.vitality, 0, 130);
  state.stats.spiritualPower = clamp(state.stats.spiritualPower, 20, 220);
  state.stats.divineSense = clamp(state.stats.divineSense, 10, 220);
  state.stats.daoHeart = clamp(state.stats.daoHeart, 5, 120);
  state.stats.luck = clamp(state.stats.luck, 0, 120);
  state.stats.reputation = clamp(state.stats.reputation, -80, 180);
  state.stats.karma = clamp(state.stats.karma, -120, 120);
  state.stats.demonicIntent = clamp(state.stats.demonicIntent, 0, 160);
  state.resources.spiritStones = Math.max(0, state.resources.spiritStones);
  state.resources.pills = Math.max(0, state.resources.pills);
  state.resources.herbs = Math.max(0, state.resources.herbs);
  state.resources.materials = Math.max(0, state.resources.materials);
  state.resources.contribution = Math.max(0, state.resources.contribution);
  updateSectRank(state);
  unlockLocationsFromState(state);
  state.world.chapter = clamp(
    Math.max(state.stats.realmIndex + 1, Math.floor(state.world.turn / 5) + 1),
    1,
    CHAPTERS.length
  );
  state.daoPath = deriveDaoPath(state);
}

function unlockLocationsFromState(state) {
  if (state.flags.marketUnlocked || state.resources.spiritStones >= 80 || relation(state, "merchant").affinity >= 18) {
    if (!state.world.accessibleLocations.includes("萬寶坊市")) {
      state.world.accessibleLocations.push("萬寶坊市");
    }
  }
  if (state.flags.caveUnlocked || state.flags.remnantPageFound || state.stats.realmIndex >= 1) {
    if (!state.world.accessibleLocations.includes("古修洞府")) {
      state.world.accessibleLocations.push("古修洞府");
    }
  }
  if (state.stats.realmIndex >= 1 || state.stats.demonicIntent >= 30) {
    if (!state.world.accessibleLocations.includes("黑風谷")) {
      state.world.accessibleLocations.push("黑風谷");
    }
  }
}

function updateSectRank(state) {
  if (state.resources.contribution >= 120 && state.stats.realmIndex >= 1 && relation(state, "master").trust >= 30) {
    state.world.sectRank = "親傳弟子";
    return;
  }
  if (state.resources.contribution >= 58 || state.stats.reputation >= 36 || state.stats.realmIndex >= 1) {
    state.world.sectRank = "內門弟子";
    return;
  }
  state.world.sectRank = "外門弟子";
}

function gainCultivation(state, amount) {
  const bonus = state.stats.daoHeart >= 70 ? 1.08 : 1;
  state.stats.cultivation += Math.round(amount * trainingRate(state) * bonus);
}

function heal(state, amount) {
  state.stats.vitality = clamp(state.stats.vitality + amount, 0, 130);
}

function spendResource(state, key, amount) {
  state.resources[key] = Math.max(0, state.resources[key] - amount);
}

function weightedPick(state, options) {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let target = roll(state) * total;
  for (const option of options) {
    target -= option.weight;
    if (target <= 0) return option.item;
  }
  return options[options.length - 1].item;
}

function scoreFromState(state) {
  const artifactBonus = state.inventory.filter((item) => item.type === "法寶").length * 5;
  const relationBonus = relation(state, "master").trust * 0.3 + relation(state, "senior").affinity * 0.2;
  return (
    state.stats.realmIndex * 45 +
    state.stats.spiritualPower * 0.5 +
    state.stats.divineSense * 0.35 +
    state.stats.daoHeart * 0.28 +
    state.stats.vitality * 0.18 +
    artifactBonus +
    relationBonus
  );
}

function resolveChallenge(state, difficulty, tags = {}) {
  let score = scoreFromState(state);
  score += state.stats.luck * 0.22;
  if (tags.righteous && state.daoPath === "正道") score += 10;
  if (tags.demonic && state.daoPath === "魔道") score += 12;
  if (tags.boss && state.stats.realmIndex >= 2) score += 14;
  if (tags.usesPill && state.resources.pills > 0) {
    spendResource(state, "pills", 1);
    score += 18;
  }
  const rollBonus = randomBetween(state, -12, 18);
  return score + rollBonus >= difficulty;
}

function currentChapterTitle(state) {
  return CHAPTERS[state.world.chapter - 1];
}

function locationSummary(state) {
  const location = findById(LOCATIONS, state.world.location);
  return `${location.id}．風險 ${location.risk}`;
}

function statSummary(state) {
  return [
    `${realmData(state).id} ${state.stats.cultivation} / ${realmData(state).nextThreshold}`,
    `年齡 ${formatAge(state)}`,
    `道途 ${state.daoPath}`,
    `聲望 ${state.stats.reputation}`,
  ].join("｜");
}

function describeRecentMemory(state) {
  return state.memories[0] || "你尚未在修行界留下鮮明痕跡。";
}

function createOption(id, label, copy, onChoose) {
  return { id, label, copy, onChoose };
}

function scene(title, body, options, meta = {}) {
  return {
    title,
    body,
    options,
    ...meta,
  };
}

function buildPrologueScene(state) {
  const intro = [
    `你名為 ${state.profile.name}，出身 ${state.profile.origin}，身負 ${state.profile.root}，性情 ${state.profile.personality}，命格則是「${state.profile.destiny}」。`,
    "山雨將歇，凡塵鎮外泥路漫長。前方是青雲宗招收門人的山門，後方是你曾熟悉、卻已無法久留的人間。",
    "今夜，你必須決定要以何種姿態踏出第一步。",
  ].join("\n\n");

  return scene(
    "凡塵初啟",
    intro,
    [
      createOption("prologue-seek", "循規入山門", "穩妥投身青雲宗，先保根基與名分。", () => {
        state.storyPhase = "play";
        state.world.location = "青雲宗";
        state.flags.prologueChoice = "seek-sect";
        state.resources.contribution += 8;
        state.stats.reputation += 6;
        adjustRelationship(state, "master", { affinity: 4, trust: 4 });
        addPathInfluence(state, { 正道: 2 });
        pushMemory(state, "你以規矩與耐心拜入青雲宗，得了山門庇護。");
        addBiography(state, "你在山門考核中步步不躁，順利成為青雲宗外門弟子。");
        state.recentOutcome = "你按著規矩遞上名帖，換來一塊刻著外門名號的青玉牌。";
        return finalizeTurn(state, false);
      }),
      createOption("prologue-rain", "先去山雨夜救人", "追隨本能，在鎮外山道尋一場可能改命的機緣。", () => {
        state.storyPhase = "play";
        state.world.location = "凡塵鎮";
        state.flags.prologueChoice = "rainy-night";
        state.flags.rainyNightResolved = false;
        state.stats.luck += 6;
        state.stats.karma += 4;
        addPathInfluence(state, { 正道: 1, 逍遙道: 1 });
        pushMemory(state, "你沒有立刻上山，而是在山雨夜中追向一縷求救氣息。");
        addBiography(state, "你在入宗前先逆雨而行，只為尋一條心中覺得該走的路。");
        state.recentOutcome = "夜雨深處傳來微弱咳聲，你提著燈火循聲而去。";
        return buildActionScene(state, "explore");
      }),
      createOption("prologue-vow", "立誓只憑自己", "暫不倚靠宗門，先靠機緣與手段站穩腳跟。", () => {
        state.storyPhase = "play";
        state.world.location = "落月山脈";
        state.flags.prologueChoice = "wanderer";
        state.resources.spiritStones += 10;
        state.stats.reputation -= 4;
        state.stats.daoHeart += 4;
        addPathInfluence(state, { 逍遙道: 2, 霸道: 1 });
        pushMemory(state, "你立誓不先寄人籬下，決意以散修之姿搏一條路。");
        addBiography(state, "你沒有立刻投宗，而是先往落月山脈摸索第一份機緣。");
        state.recentOutcome = "你將名帖收入袖中，踩著濕石徑直走向山脈深處。";
        return finalizeTurn(state, false);
      }),
    ],
    { kind: "prologue" }
  );
}

function buildHubScene(state) {
  const body = [
    `${currentChapterTitle(state)}．${locationSummary(state)}`,
    `當前境界為 ${realmData(state).id}，修為累積 ${state.stats.cultivation}，道心 ${state.stats.daoHeart}，魔念 ${state.stats.demonicIntent}。`,
    `最近回響：${state.recentOutcome}`,
    `心中未散的念頭：${describeRecentMemory(state)}`,
    isBreakthroughReady(state) ? "你已隱約觸及下一境界瓶頸，若再拖延，靈力便會在經脈間反覆震盪。" : "你仍在積蓄底蘊，任何一個選擇都可能成為下一次命運轉折。",
  ].join("\n\n");
  return scene(
    `${state.profile.name}的行旅`,
    body,
    [
      createOption("hub-cultivate", "閉關修煉", "提升修為、道心，並在瓶頸時嘗試突破。", () => buildActionScene(state, "cultivate")),
      createOption("hub-sect", "宗門事務", "處理宗門競逐、任務與派系往來。", () => buildActionScene(state, "sect")),
      createOption("hub-explore", "外出探索", "在當前地點尋找奇遇、危局與資源。", () => buildActionScene(state, "explore")),
      createOption("hub-relate", "經營關係", "與師長、同門、宿敵與凡塵牽掛互動。", () => buildActionScene(state, "relationship")),
      createOption("hub-travel", "行旅換地", "前往其他地點，切換事件池與風險。", () => buildJourneyScene(state)),
    ],
    { kind: "hub" }
  );
}

function buildJourneyScene(state) {
  const options = state.world.accessibleLocations.map((locationId) =>
    createOption(
      `travel-${locationId}`,
      locationId,
      `${findById(LOCATIONS, locationId).summary}`,
      () => {
        changeLocation(state, locationId);
        state.recentOutcome = `你動身前往 ${locationId}，一路所見都在提醒你，修士的路從不只一條。`;
        pushMemory(state, `你改道前往 ${locationId}。`);
        advanceTime(state, locationId === "古修洞府" ? 6 : 4);
        return finalizeTurn(state);
      }
    )
  );
  return scene(
    "行旅換地",
    "地點會改變可觸發事件、風險與世界回饋。選一處你想前往的地方。",
    options,
    { kind: "travel" }
  );
}

function hasItem(state, name) {
  return state.inventory.some((entry) => entry.name === name);
}

function chooseEvent(state, category) {
  const candidates = EVENT_DEFS.filter((event) => event.category === category && event.condition(state) && !onCooldown(state, event.id));
  if (!candidates.length) {
    return FALLBACK_EVENTS[category](state);
  }
  const weighted = candidates.map((event) => ({
    item: event,
    weight: typeof event.weight === "function" ? event.weight(state) : event.weight,
  }));
  return weightedPick(state, weighted).create(state);
}

function buildActionScene(state, category) {
  return chooseEvent(state, category);
}

function applyStandardCosts(state, config) {
  if (config.months) advanceTime(state, config.months);
  if (config.vitality) state.stats.vitality += config.vitality;
  if (config.spiritStones) state.resources.spiritStones += config.spiritStones;
  if (config.herbs) state.resources.herbs += config.herbs;
  if (config.pills) state.resources.pills += config.pills;
  if (config.materials) state.resources.materials += config.materials;
  if (config.contribution) state.resources.contribution += config.contribution;
  if (config.reputation) state.stats.reputation += config.reputation;
  if (config.karma) state.stats.karma += config.karma;
  if (config.daoHeart) state.stats.daoHeart += config.daoHeart;
  if (config.luck) state.stats.luck += config.luck;
  if (config.spiritualPower) state.stats.spiritualPower += config.spiritualPower;
  if (config.divineSense) state.stats.divineSense += config.divineSense;
  if (config.demonicIntent) state.stats.demonicIntent += config.demonicIntent;
  if (config.cultivation) gainCultivation(state, config.cultivation);
  refreshDerivedState(state);
}

function attemptBreakthrough(state, style) {
  const next = nextRealm(state);
  if (!next) {
    state.recentOutcome = "你已站在化神巔峰，再往前就是難以言說的天門。";
    return finalizeTurn(state);
  }
  let difficulty = 88 + state.stats.realmIndex * 48;
  if (style === "stable") difficulty -= 12;
  if (style === "reckless") difficulty += 8;
  if (style === "treasure") {
    difficulty -= state.resources.pills > 0 ? 18 : 2;
  }
  const success = resolveChallenge(state, difficulty, {
    righteous: state.daoPath === "正道",
    demonic: state.daoPath === "魔道",
    usesPill: style === "treasure",
  });
  advanceTime(state, 8);
  incrementEventCount(state, "breakthrough-trial");
  if (success) {
    state.stats.realmIndex += 1;
    state.stats.spiritualPower += 14 + state.stats.realmIndex * 4;
    state.stats.divineSense += 8 + state.stats.realmIndex * 3;
    state.stats.daoHeart += style === "stable" ? 6 : 2;
    state.stats.vitality = clamp(state.stats.vitality + 18, 0, 130);
    state.stats.lifespan += REALMS[state.stats.realmIndex].lifespanBonus;
    state.stats.reputation += 8 + state.stats.realmIndex * 3;
    addBiography(state, `你成功踏入 ${realmData(state).id}，自此壽元與氣象都與舊日不同。`);
    pushMemory(state, `你破開瓶頸，正式踏入 ${realmData(state).id}。`);
    state.recentOutcome = `閉關多月後，你終於撕開瓶頸，靈台如潮翻湧，成功踏入 ${realmData(state).id}。`;
    if (state.stats.realmIndex >= 2) {
      state.flags.thunderTempered = true;
    }
    return finalizeTurn(state);
  }
  const severe = style === "reckless" || state.stats.daoHeart < 50;
  state.stats.vitality -= severe ? 24 : 14;
  state.stats.daoHeart -= severe ? 8 : 4;
  state.stats.demonicIntent += severe ? 14 : 8;
  state.recentOutcome = severe
    ? "你強行衝關失利，經脈灼裂，心中生出一絲不肯散去的躁火。"
    : "你在關口前退了半步，雖未晉境，卻也帶著傷勢摸清了瓶頸輪廓。";
  pushMemory(state, "一次失敗的突破讓你看見自身執念。");
  addBiography(state, "你曾在突破關頭受創，這段傷勢化成未散的心魔。");
  return finalizeTurn(state);
}

function finalizeTurn(state, advance = true) {
  if (advance) {
    refreshDerivedState(state);
  }
  const ending = detectEnding(state);
  if (ending) {
    return { ending };
  }
  return buildHubScene(state);
}

function detectEnding(state) {
  if (state.stats.vitality <= 0) {
    return createEnding(
      state,
      "兵解道消",
      "連番劫難之後，你的肉身終於撐不住最後一道傷勢。神魂未散，但此生修行只能止於此處。",
      "warn"
    );
  }
  if (state.stats.age >= state.stats.lifespan) {
    return createEnding(
      state,
      "壽元將盡",
      "你終究未能完全跨過歲月。臨終前回望一生，凡塵、宗門、宿敵與情義都化成了一卷可傳後人的傳記。",
      "warn"
    );
  }
  if (state.stats.demonicIntent >= 120 && state.stats.daoHeart <= 46) {
    return createEnding(
      state,
      "墮入魔途",
      "你以力量壓過了一切猶疑，卻也讓心中最柔軟的一處徹底沉沒。從今以後，世人提起你，多半只剩敬畏與恐懼。",
      "warn"
    );
  }
  if (state.stats.realmIndex === 4 && state.stats.cultivation >= 1080 && state.stats.daoHeart >= 82) {
    return createEnding(
      state,
      "問道飛升",
      "天門洞開時，你終於能直視曾經所有執念。那些救過的人、失過的手、守過的諾言，都在雷光中成了你真正的道。",
      "glory"
    );
  }
  if (
    state.stats.realmIndex >= 3 &&
    state.resources.contribution >= 150 &&
    relation(state, "disciple").bond >= 18 &&
    state.stats.reputation >= 90
  ) {
    return createEnding(
      state,
      "開宗立脈",
      "你沒有追逐最高天門，而是在亂世之後留下自己的道統。門下弟子稱你為開派祖師，凡塵與宗門都記住了你的名字。",
      "glory"
    );
  }
  return null;
}

function createEnding(state, title, copy, tone) {
  const highlights = [
    `道途：${state.daoPath}`,
    `境界：${realmData(state).id}`,
    `年歲：${formatAge(state)}`,
    `聲望：${state.stats.reputation}`,
    `關鍵回響：${describeRecentMemory(state)}`,
  ];
  return {
    title,
    copy,
    tone,
    highlights,
    biography: state.biography.slice(0, 8),
  };
}

function genericTrainingBody(state) {
  return [
    `你在 ${state.world.location} 收束雜念，靈力沿著《入門吐納訣》一寸寸推進。`,
    `經脈的震盪提醒著你，此刻最重要的不是快，而是知道何時該快、何時該停。`,
  ].join("\n\n");
}

const EVENT_DEFS = [
  {
    id: "rainy-night",
    category: "explore",
    weight: 14,
    condition: (state) => !state.flags.rainyNightResolved && currentYear(state) <= 2,
    create(state) {
      incrementEventCount(state, "rainy-night");
      return scene(
        "山雨夜遇墜崖修士",
        "雨幕裡，一名衣袍染血的修士倒在山道邊。她腰間的青雲令牌微微發光，而遠處還有搜尋的火把正在逼近。",
        [
          createOption("rainy-help", "先救人藏身", "冒著被牽連的風險，先救下一條命。", () => {
            state.flags.rainyNightResolved = true;
            state.world.location = "青雲宗";
            state.resources.contribution += 10;
            state.stats.karma += 8;
            state.stats.reputation += 8;
            adjustRelationship(state, "master", { affinity: 8, trust: 6, unlocked: true });
            pushMemory(state, "你曾在山雨夜救下青雲宗修士，因此得了入門機緣。");
            addBiography(state, "山雨夜中，你救下一名墜崖修士，從此正式與青雲宗結緣。");
            state.recentOutcome = "你背起傷者藏進破廟，直到天明才知道，那人竟是青雲宗長老座下的親傳。";
            advanceTime(state, 3);
            return finalizeTurn(state);
          }),
          createOption("rainy-search", "趁亂搜其儲物袋", "先拿到能改命的資源，再說別的。", () => {
            state.flags.rainyNightResolved = true;
            state.resources.spiritStones += 24;
            state.resources.pills += 1;
            state.stats.karma -= 8;
            state.stats.demonicIntent += 8;
            adjustRelationship(state, "rival", { grudge: 4 });
            addPathInfluence(state, { 霸道: 1, 魔道: 2 });
            pushMemory(state, "你曾在雨夜趁亂取走他人儲物袋，這件事尚未有人清楚知曉。");
            state.recentOutcome = "你在雷光下取走儲物袋，身後那枚令牌的青光卻像在記住你的臉。";
            advanceTime(state, 2);
            return finalizeTurn(state);
          }),
          createOption("rainy-leave", "不願沾惹是非", "遠離這場未知因果，保全自己。", () => {
            state.flags.rainyNightResolved = true;
            state.stats.daoHeart += 2;
            state.stats.reputation -= 2;
            state.stats.luck -= 2;
            addPathInfluence(state, { 無情道: 1, 逍遙道: 1 });
            state.recentOutcome = "你最終沒有回頭。翌日再聽人提起此事時，只覺心底像錯過了一截本該握住的命線。";
            advanceTime(state, 2);
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "rainy-night" }
      );
    },
  },
  {
    id: "cliff-meditation",
    category: "cultivate",
    weight: (state) => (isBreakthroughReady(state) ? 8 : 14),
    condition: () => true,
    create(state) {
      return scene(
        "松風崖吐納",
        genericTrainingBody(state),
        [
          createOption("meditate-steady", "守一吐納", "穩定提升修為與道心。", () => {
            applyStandardCosts(state, {
              months: 5,
              cultivation: 22,
              daoHeart: 4,
              vitality: 4,
            });
            state.recentOutcome = "你在松風中守著一口綿長氣息，修為漸進，道心也沉得更穩。";
            pushMemory(state, "一次平穩的閉關讓你明白，根基比速度更重要。");
            return finalizeTurn(state);
          }),
          createOption("meditate-force", "逆行靈脈", "換取更快修為，但有傷經脈風險。", () => {
            applyStandardCosts(state, {
              months: 4,
              cultivation: 34,
              daoHeart: -4,
              vitality: -10,
              demonicIntent: 4,
            });
            addPathInfluence(state, { 霸道: 1 });
            state.recentOutcome = "你以近乎蠻橫的方式壓榨靈脈，修為暴漲一截，肺腑間卻留下一絲灼痛。";
            return finalizeTurn(state);
          }),
          createOption("meditate-cloud", "觀雲入定", "修為慢些，卻更利於神識與福緣。", () => {
            applyStandardCosts(state, {
              months: 4,
              cultivation: 14,
              divineSense: 8,
              luck: 4,
              daoHeart: 2,
            });
            addPathInfluence(state, { 逍遙道: 1, 無情道: 1 });
            state.recentOutcome = "你看雲氣化散又凝，忽然覺得許多從前放不下的念頭都淡了些。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "cliff-meditation" }
      );
    },
  },
  {
    id: "scripture-hall",
    category: "cultivate",
    weight: 10,
    condition: (state) => state.resources.contribution >= 10 && !onCooldown(state, "scripture-hall"),
    create(state) {
      return scene(
        "藏經閣借卷",
        "藏經閣中卷帙堆如山。韓玄峰長老在窗下閉目不語，只等你開口說明來意。",
        [
          createOption("scripture-borrow", "用貢獻換玉簡", "花些貢獻，換一門更合用的術法。", () => {
            spendResource(state, "contribution", 10);
            addItem(state, itemDetails("青雲御風訣", "功法", "黃階", "行動時略增身法與探索收益。"));
            applyStandardCosts(state, {
              months: 4,
              cultivation: 18,
              divineSense: 4,
            });
            state.flags.manualBorrowed = true;
            setCooldown(state, "scripture-hall", 3);
            state.recentOutcome = "你以貢獻換得一枚玉簡，御風心法入手後，行氣轉折變得明顯流暢。";
            addBiography(state, "你在藏經閣換得《青雲御風訣》，從此身法大進。");
            return finalizeTurn(state);
          }),
          createOption("scripture-copy", "抄錄外卷筆記", "少花資源，穩定增益。", () => {
            applyStandardCosts(state, {
              months: 3,
              cultivation: 16,
              daoHeart: 3,
              contribution: 2,
            });
            setCooldown(state, "scripture-hall", 2);
            state.recentOutcome = "你在外卷處抄錄整夜，雖未得秘法，卻把根基再推實了幾分。";
            return finalizeTurn(state);
          }),
          createOption("scripture-argue", "向長老請教難處", "冒著被責備的風險，爭取指點。", () => {
            const success = relation(state, "elder").trust + state.stats.daoHeart > 78;
            adjustRelationship(state, "elder", { unlocked: true, trust: success ? 10 : -4 });
            applyStandardCosts(state, {
              months: 2,
              cultivation: success ? 20 : 10,
              reputation: success ? 4 : -2,
              daoHeart: success ? 4 : 0,
            });
            setCooldown(state, "scripture-hall", 2);
            state.recentOutcome = success
              ? "韓玄峰終於睜眼，只點了你幾句，卻讓你一整個月都在反覆體會。"
              : "你提出的疑問太過急切，被韓玄峰一句『心浮氣躁』打得啞口無言。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "scripture-hall" }
      );
    },
  },
  {
    id: "breakthrough-trial",
    category: "cultivate",
    weight: 18,
    condition: (state) => isBreakthroughReady(state),
    create(state) {
      const next = nextRealm(state);
      return scene(
        `${next.id} 關口`,
        `靈力已在經脈邊緣堆滿，你若再拖，反倒可能傷及根基。這次突破將決定你能否真正踏入 ${next.id}。`,
        [
          createOption("breakthrough-stable", "穩定衝關", "耗時較久，但失手概率最低。", () => attemptBreakthrough(state, "stable")),
          createOption("breakthrough-reckless", "強行破境", "賭一口氣直破關隘，代價也最大。", () => attemptBreakthrough(state, "reckless")),
          createOption("breakthrough-treasure", "服丹借寶", "若手中資源充足，可大幅降低難度。", () => attemptBreakthrough(state, "treasure")),
        ],
        { kind: "event", eventId: "breakthrough-trial" }
      );
    },
  },
  {
    id: "heart-demon",
    category: "cultivate",
    weight: 12,
    condition: (state) => state.stats.demonicIntent >= 24 || state.stats.daoHeart <= 48,
    create(state) {
      return scene(
        "心魔低語",
        "你在閉關時忽然聽見一縷熟悉聲音，像曾經錯過的選擇、也像從未放下的怨氣。那低語不大，卻能順著裂縫鑽進靈台。",
        [
          createOption("heart-face", "正面觀照", "以道心直視執念，穩住根基。", () => {
            applyStandardCosts(state, {
              months: 3,
              daoHeart: 8,
              demonicIntent: -10,
              cultivation: 10,
            });
            addPathInfluence(state, { 正道: 1, 無情道: 1 });
            state.recentOutcome = "你終於看清那股躁意來自哪一個傷口，於是它不再像之前那麼可怕。";
            return finalizeTurn(state);
          }),
          createOption("heart-suppress", "強壓心緒", "短期能保效率，長期更易反噬。", () => {
            applyStandardCosts(state, {
              months: 2,
              cultivation: 18,
              daoHeart: -6,
              demonicIntent: 10,
            });
            addPathInfluence(state, { 霸道: 1, 魔道: 1 });
            state.recentOutcome = "你把雜念連同情緒一併壓回去，修為是快了，心裡卻像多了一塊硬結。";
            return finalizeTurn(state);
          }),
          createOption("heart-seek-help", "去尋林秋漪", "若關係夠好，她或許能幫你穩住神魂。", () => {
            const senior = relation(state, "senior");
            senior.unlocked = true;
            if (senior.affinity >= 12) {
              applyStandardCosts(state, {
                months: 2,
                daoHeart: 10,
                demonicIntent: -14,
                reputation: 2,
              });
              adjustRelationship(state, "senior", { affinity: 6, trust: 4, bond: 2 });
              state.recentOutcome = "林秋漪替你布下安神陣，一盞茶功夫便讓靈台亂象平息大半。";
              addBiography(state, "你曾因心魔纏身而求助林秋漪，此後彼此關係更近了一步。");
            } else {
              applyStandardCosts(state, {
                months: 2,
                daoHeart: 2,
                demonicIntent: -2,
              });
              adjustRelationship(state, "senior", { affinity: 2 });
              state.recentOutcome = "她沒有多問，只留下了一包安神香。幫助不算大，卻讓你記住了這份人情。";
            }
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "heart-demon" }
      );
    },
  },
  {
    id: "outer-competition",
    category: "sect",
    weight: 12,
    condition: (state) => state.world.location === "青雲宗" && state.world.turn >= 1,
    create(state) {
      return scene(
        "外門大比",
        "青雲宗演武臺鼓聲沉沉，外門弟子依次上場。顧長夜站在對面，眼神裡的挑釁毫不遮掩。",
        [
          createOption("competition-honor", "堂堂正正應戰", "以實力與耐性取勝。", () => {
            const win = resolveChallenge(state, 90 + state.stats.realmIndex * 14, { righteous: true });
            applyStandardCosts(state, {
              months: 4,
              cultivation: 18,
              reputation: win ? 10 : 2,
              contribution: win ? 12 : 4,
              vitality: win ? -4 : -10,
            });
            adjustRelationship(state, "rival", { grudge: win ? 8 : 4, affinity: -2, unlocked: true });
            adjustRelationship(state, "master", { trust: win ? 4 : 1 });
            state.recentOutcome = win
              ? "你硬生生在演武臺上壓住顧長夜半招，掌聲未落，青雲宗內已有人記住你的名字。"
              : "你雖敗，卻把每一步都走得很穩，連蘇清衡也罕見多看了你一眼。";
            return finalizeTurn(state);
          }),
          createOption("competition-scheme", "暗藏偏鋒", "以勝負為先，哪怕手段略髒。", () => {
            const win = resolveChallenge(state, 82, { demonic: true });
            applyStandardCosts(state, {
              months: 4,
              cultivation: 20,
              reputation: win ? 4 : -6,
              contribution: win ? 10 : 3,
              vitality: -8,
              demonicIntent: 6,
            });
            adjustRelationship(state, "elder", { unlocked: true, trust: win ? -4 : -8 });
            adjustRelationship(state, "rival", { grudge: 14 });
            addPathInfluence(state, { 霸道: 2, 魔道: 1 });
            state.recentOutcome = win
              ? "你靠著一記藏而不露的偏手贏下比試，贏是贏了，臺下議論卻沒停過。"
              : "你的偏鋒被韓玄峰當眾喝止，這一戰不只輸了場面，也留下了門規上的污點。";
            return finalizeTurn(state);
          }),
          createOption("competition-yield", "觀人而退", "不急著爭鋒，換取見識與人情。", () => {
            applyStandardCosts(state, {
              months: 3,
              cultivation: 12,
              daoHeart: 4,
              reputation: 1,
              contribution: 4,
            });
            adjustRelationship(state, "senior", { affinity: 4 });
            addPathInfluence(state, { 逍遙道: 1 });
            state.recentOutcome = "你在臺下仔細看完所有人出手，雖未搶到風頭，卻把許多破綻悄悄記進心裡。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "outer-competition" }
      );
    },
  },
  {
    id: "faction-summons",
    category: "sect",
    weight: 10,
    condition: (state) =>
      state.world.location === "青雲宗" &&
      (state.resources.contribution >= 28 || state.stats.reputation >= 24),
    create(state) {
      return scene(
        "長老派系相召",
        "韓玄峰派人送來一枚青符，邀你夜赴偏殿。殿中另一側，蘇清衡也留下了一封只寫著『慎言』的短箋。",
        [
          createOption("faction-master", "站在師尊一側", "先保長遠與規矩。", () => {
            applyStandardCosts(state, {
              months: 3,
              reputation: 6,
              contribution: 8,
              daoHeart: 4,
            });
            adjustRelationship(state, "master", { trust: 8, affinity: 4 });
            adjustRelationship(state, "elder", { trust: -4 });
            state.world.factionStanding = "執劍峰";
            addPathInfluence(state, { 正道: 2 });
            state.recentOutcome = "你在偏殿裡沒有說太多，只用一個立場換來了師尊不曾明說的認可。";
            return finalizeTurn(state);
          }),
          createOption("faction-neutral", "維持中立", "不急著押寶，把眼下利益全留給自己。", () => {
            applyStandardCosts(state, {
              months: 2,
              cultivation: 14,
              daoHeart: 2,
              spiritStones: 8,
            });
            addPathInfluence(state, { 逍遙道: 2 });
            state.world.factionStanding = "中立";
            state.recentOutcome = "你含糊其辭，把所有承諾都留在門外。兩邊都不滿，但也都還想拉攏你。";
            return finalizeTurn(state);
          }),
          createOption("faction-merchant", "把消息賣去坊市", "換取靈石與情報，但風險極高。", () => {
            applyStandardCosts(state, {
              months: 2,
              spiritStones: 24,
              reputation: -4,
              demonicIntent: 4,
            });
            adjustRelationship(state, "merchant", { unlocked: true, affinity: 8, trust: 4 });
            adjustRelationship(state, "elder", { unlocked: true, trust: -8 });
            state.flags.marketUnlocked = true;
            state.recentOutcome = "夜色未散，萬寶坊市已經知道青雲宗內部哪座山頭在動。你得了靈石，也得了新的把柄。";
            addPathInfluence(state, { 霸道: 1, 逍遙道: 1 });
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "faction-summons" }
      );
    },
  },
  {
    id: "escort-mission",
    category: "sect",
    weight: 11,
    condition: (state) => state.world.location === "青雲宗",
    create(state) {
      return scene(
        "外派護送",
        "宗門要送一批丹材去萬寶坊市，路經黑風谷外圍。隊伍不大，卻明顯有人盯上了這趟貨。",
        [
          createOption("escort-guard", "全程護送商隊", "穩拿資源與宗門評價。", () => {
            const win = resolveChallenge(state, 92, { righteous: true });
            applyStandardCosts(state, {
              months: 5,
              spiritStones: win ? 18 : 10,
              contribution: win ? 10 : 6,
              reputation: win ? 6 : 2,
              vitality: win ? -6 : -14,
              materials: 1,
            });
            state.flags.marketUnlocked = true;
            state.recentOutcome = win
              ? "你壓住沿途匪修的試探，護送任務完成得乾淨利落，宗門與商隊都欠下你一分情。"
              : "路上雖有損耗，你仍撐著把貨送進坊市，只是傷勢提醒你實力還差一線。";
            return finalizeTurn(state);
          }),
          createOption("escort-scout", "獨自先行探路", "提高風險，換取更多奇遇機會。", () => {
            const success = resolveChallenge(state, 88);
            applyStandardCosts(state, {
              months: 4,
              spiritStones: success ? 14 : 8,
              contribution: 6,
              luck: success ? 6 : 0,
              vitality: success ? -4 : -12,
              herbs: success ? 2 : 0,
            });
            if (success) {
              state.flags.marketUnlocked = true;
              pushMemory(state, "你曾在護送任務裡先行探路，順手摸回一批靈草。");
            }
            state.recentOutcome = success
              ? "你在前方暗探出一條側道，不只避開伏兵，還在山崖縫裡挖到了幾株靈草。"
              : "你雖探出伏兵，自己也挨了一記暗器，回到隊伍時衣角全是血。";
            return finalizeTurn(state);
          }),
          createOption("escort-skim", "私留一成貨物", "短期資源暴增，但因果與門規會記帳。", () => {
            applyStandardCosts(state, {
              months: 4,
              spiritStones: 28,
              pills: 1,
              reputation: -8,
              demonicIntent: 6,
              karma: -6,
            });
            adjustRelationship(state, "merchant", { unlocked: true, affinity: 4 });
            adjustRelationship(state, "elder", { unlocked: true, trust: -10 });
            addPathInfluence(state, { 霸道: 2, 魔道: 1 });
            state.flags.marketUnlocked = true;
            state.recentOutcome = "你在帳冊上抹去了一筆微不足道的出入。眼前靈石增了，心裡那筆帳卻沒有真的消失。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "escort-mission" }
      );
    },
  },
  {
    id: "law-hall",
    category: "sect",
    weight: 9,
    condition: (state) =>
      state.world.location === "青雲宗" &&
      (state.stats.reputation <= 2 || state.stats.demonicIntent >= 26 || relation(state, "elder").trust <= -4),
    create(state) {
      return scene(
        "懲戒堂問罪",
        "韓玄峰將一卷卷宗推到你面前。上頭記著你近來幾次行事的疑點，他不急著定罪，只等你自己開口。",
        [
          createOption("law-confess", "承認過失", "損失資源，換回部分信任。", () => {
            applyStandardCosts(state, {
              months: 2,
              contribution: -8,
              reputation: 4,
              daoHeart: 4,
            });
            adjustRelationship(state, "elder", { trust: 6 });
            addPathInfluence(state, { 正道: 1 });
            state.recentOutcome = "你沒有為自己找藉口。韓玄峰看了你很久，只留下一句『知錯，便還有救』。";
            return finalizeTurn(state);
          }),
          createOption("law-deny", "推諉模糊", "守住眼前利益，但後患更深。", () => {
            applyStandardCosts(state, {
              months: 2,
              reputation: -6,
              demonicIntent: 6,
            });
            adjustRelationship(state, "elder", { trust: -8 });
            addPathInfluence(state, { 霸道: 1, 無情道: 1 });
            state.recentOutcome = "你一字一句都避開實處，暫時脫身了，卻也讓韓玄峰徹底把你記上了心。";
            return finalizeTurn(state);
          }),
          createOption("law-seek-senior", "請師長作保", "若人情夠深，可大事化小。", () => {
            const support = relation(state, "master").trust + relation(state, "senior").affinity >= 42;
            applyStandardCosts(state, {
              months: 2,
              reputation: support ? 2 : -4,
              contribution: support ? -4 : -10,
              daoHeart: support ? 2 : -2,
            });
            adjustRelationship(state, "master", { trust: support ? 2 : -2 });
            adjustRelationship(state, "senior", { affinity: support ? 3 : 1 });
            state.recentOutcome = support
              ? "有人替你說了一句話，事情便只剩一紙輕罰。你知道這份人情早晚得還。"
              : "你本以為能借人情脫身，結果只換來一句『下不為例』，面子和貢獻都折了。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "law-hall" }
      );
    },
  },
  {
    id: "herb-ravine",
    category: "explore",
    weight: 12,
    condition: (state) => ["落月山脈", "黑風谷"].includes(state.world.location),
    create(state) {
      return scene(
        "靈草深澗",
        "山澗裡霧氣濃重，石壁上幾株靈草在晨光下泛著淡青色光。你還看見一道利爪留下的抓痕，顯然不是只有你盯上這裡。",
        [
          createOption("herb-harvest", "搶先採藥", "賺靈草與丹藥素材。", () => {
            applyStandardCosts(state, {
              months: 3,
              herbs: 3,
              materials: 1,
              vitality: -4,
              cultivation: 10,
            });
            state.recentOutcome = "你趁著霧氣未散將靈草一口氣全摘下，手上多了青汁與幾道淺傷。";
            return finalizeTurn(state);
          }),
          createOption("herb-track", "循痕找妖獸巢", "高風險換更多資源或夥伴線。", () => {
            const success = resolveChallenge(state, 96);
            applyStandardCosts(state, {
              months: 4,
              materials: success ? 3 : 1,
              vitality: success ? -8 : -16,
              luck: success ? 4 : 0,
            });
            if (success && !state.flags.beastBonded && relation(state, "beast").affinity >= 10) {
              relation(state, "beast").unlocked = true;
            }
            state.recentOutcome = success
              ? "你循著抓痕找到一處半毀獸巢，裡頭除了獸骨，還有一枚尚未完全失活的妖核。"
              : "妖獸比你更早察覺異動。你雖帶著材料逃出來，肩頭也被撕出一道深痕。";
            return finalizeTurn(state);
          }),
          createOption("herb-mark", "留下記號日後再來", "降低風險，兼顧福緣。", () => {
            applyStandardCosts(state, {
              months: 2,
              luck: 6,
              daoHeart: 2,
              cultivation: 8,
            });
            state.recentOutcome = "你沒有急著動手，只把地勢與風向一一記下，準備下一次帶著更周全的手段回來。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "herb-ravine" }
      );
    },
  },
  {
    id: "moon-remnant",
    category: "explore",
    weight: 10,
    condition: (state) =>
      ["落月山脈", "古修洞府"].includes(state.world.location) &&
      (!state.flags.remnantPageFound || state.world.location === "古修洞府"),
    create(state) {
      return scene(
        "古洞府殘頁",
        "石壁裂縫裡卡著半張玉頁，上頭刻著殘缺劍勢。光是看上一眼，便覺識海像被一道冷月劃開。",
        [
          createOption("moon-study", "就地參悟", "換取功法與修為，但耗心神。", () => {
            applyStandardCosts(state, {
              months: 4,
              cultivation: 22,
              divineSense: 6,
              vitality: -6,
            });
            addItem(state, itemDetails("殘月劍頁", "功法", "玄階", "衝突與突破時略增勝率。"));
            state.flags.remnantPageFound = true;
            state.flags.caveUnlocked = true;
            pushMemory(state, "你得了一頁古修劍訣殘篇，往後的許多機緣都可能因它而來。");
            addBiography(state, "你在落月山脈得到一頁古修劍訣，從此劍路明顯不同。");
            state.recentOutcome = "你在山壁前盤坐半日，最終將那道殘缺劍意納進心中，也換來幾分識海刺痛。";
            return finalizeTurn(state);
          }),
          createOption("moon-inform", "帶回宗門上交", "降低獨吞風險，換宗門資源。", () => {
            applyStandardCosts(state, {
              months: 3,
              contribution: 18,
              reputation: 8,
              daoHeart: 4,
            });
            adjustRelationship(state, "master", { trust: 6, affinity: 2 });
            state.flags.caveUnlocked = true;
            state.recentOutcome = "你將殘頁上交宗門，雖未獨得傳承，卻換來一筆不小的貢獻與師門信任。";
            addPathInfluence(state, { 正道: 2 });
            return finalizeTurn(state);
          }),
          createOption("moon-sell", "暗中賣給坊市", "直接換靈石，並留下新的追索線。", () => {
            applyStandardCosts(state, {
              months: 3,
              spiritStones: 42,
              reputation: -6,
              demonicIntent: 6,
            });
            adjustRelationship(state, "merchant", { unlocked: true, affinity: 6, trust: 2 });
            state.flags.marketUnlocked = true;
            state.flags.caveUnlocked = true;
            state.recentOutcome = "沈萬錢只看了一眼便願意出高價。你知道自己賣掉的不只是殘頁，還有後續所有目光。";
            addPathInfluence(state, { 逍遙道: 1, 霸道: 1 });
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "moon-remnant" }
      );
    },
  },
  {
    id: "black-wind-ambush",
    category: "explore",
    weight: 12,
    condition: (state) => state.world.location === "黑風谷",
    create(state) {
      return scene(
        "黑風谷伏殺",
        "谷中黑風裹著砂石，你剛踏過一段斷崖，前後便各自冒出兩道人影。對方衣袍上沒有宗門紋樣，卻帶著很重的血腥氣。",
        [
          createOption("ambush-fight", "當場迎戰", "硬吃風險，換高額戰利。", () => {
            const win = resolveChallenge(state, 106 + state.stats.realmIndex * 10, { boss: true });
            applyStandardCosts(state, {
              months: 4,
              spiritStones: win ? 30 : 10,
              materials: win ? 2 : 1,
              vitality: win ? -12 : -22,
              reputation: win ? 6 : -4,
            });
            state.recentOutcome = win
              ? "你在黑風裡斬落最後一名伏修，順手收走對方乾坤袋，谷風裡的血味卻久久不散。"
              : "你拼命殺出一條血路，雖沒把命丟在谷裡，身上每一道傷都像在提醒你別再自恃太過。";
            return finalizeTurn(state);
          }),
          createOption("ambush-flee", "借地勢脫逃", "少拿好處，保命為先。", () => {
            applyStandardCosts(state, {
              months: 3,
              vitality: -6,
              luck: 4,
              cultivation: 10,
            });
            addPathInfluence(state, { 逍遙道: 1 });
            state.recentOutcome = "你沒有戀戰，借著谷風和斷崖折返，最終只留下幾滴血便脫身而去。";
            return finalizeTurn(state);
          }),
          createOption("ambush-parley", "與魔修談條件", "若走得夠偏，危局也能變成交情。", () => {
            const success = state.daoPath === "魔道" || state.stats.demonicIntent >= 36;
            applyStandardCosts(state, {
              months: 3,
              spiritStones: success ? 16 : 4,
              demonicIntent: success ? 8 : 4,
              reputation: success ? -4 : -6,
            });
            adjustRelationship(state, "fiend", { unlocked: true, affinity: success ? 10 : 4, trust: success ? 6 : 0 });
            state.recentOutcome = success
              ? "對方似乎嗅到了你身上的某種同類氣息，最後收刀笑退，還丟給你一個染血的玉瓶。"
              : "你試圖談條件，但對方顯然不信，只在你身上多添了一道傷後才不耐離去。";
            addPathInfluence(state, { 魔道: 2, 霸道: 1 });
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "black-wind-ambush" }
      );
    },
  },
  {
    id: "market-rumor",
    category: "explore",
    weight: 11,
    condition: (state) => ["凡塵鎮", "萬寶坊市"].includes(state.world.location),
    create(state) {
      return scene(
        "坊市風聞",
        "萬寶坊市與凡塵鎮交會之處最不缺的就是消息。有的人賣傳聞，有的人賣命，也有人拿一張舊地圖換下一場殺劫。",
        [
          createOption("market-buy-map", "買下殘圖", "花靈石開新地點與機緣。", () => {
            spendResource(state, "spiritStones", 12);
            applyStandardCosts(state, {
              months: 2,
              luck: 6,
              contribution: 2,
            });
            state.flags.caveUnlocked = true;
            state.flags.marketUnlocked = true;
            state.recentOutcome = "你用十二枚靈石換來一張潮濕殘圖，圖上標出的洞府位置讓你一整夜都沒睡穩。";
            return finalizeTurn(state);
          }),
          createOption("market-listen", "坐下聽一夜風聲", "穩定提高福緣與後續權重。", () => {
            applyStandardCosts(state, {
              months: 2,
              luck: 8,
              divineSense: 4,
              reputation: 2,
            });
            adjustRelationship(state, "merchant", { unlocked: true, affinity: 4 });
            state.flags.marketUnlocked = true;
            state.recentOutcome = "你用一壺薄酒換來幾樁真假難分的消息，卻也因此先一步察覺到黑風谷近日不太平。";
            return finalizeTurn(state);
          }),
          createOption("market-invest", "與沈萬錢合股", "拿靈石去換更大的靈石。", () => {
            const stake = Math.min(20, state.resources.spiritStones);
            spendResource(state, "spiritStones", stake);
            const profit = stake >= 10 ? randomBetween(state, 12, 30) : 6;
            applyStandardCosts(state, {
              months: 3,
              spiritStones: profit,
              reputation: 2,
            });
            adjustRelationship(state, "merchant", { unlocked: true, affinity: 8, trust: 6 });
            state.flags.allianceWithMerchant = true;
            state.flags.marketUnlocked = true;
            state.recentOutcome = `你把 ${stake} 枚靈石押進沈萬錢的手裡，三月後果然翻回 ${profit} 枚。從此你在坊市多了一條暗線。`;
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "market-rumor" }
      );
    },
  },
  {
    id: "ancient-cave",
    category: "explore",
    weight: 13,
    condition: (state) => state.world.location === "古修洞府" || (state.flags.caveUnlocked && state.world.location === "落月山脈"),
    create(state) {
      return scene(
        "古修洞府",
        "洞府石門半掩，內裡禁制破碎，卻還殘留一道幾乎能割開神識的威壓。你知道真正的東西通常藏在最危險的位置。",
        [
          createOption("cave-blood", "以精血開禁", "強行奪取傳承，代價是傷勢與因果。", () => {
            applyStandardCosts(state, {
              months: 5,
              vitality: -18,
              cultivation: 28,
              demonicIntent: 10,
              luck: 4,
            });
            addItem(state, itemDetails("古修傳承令", "法寶", "地階", "突破時降低失手概率，並提高終局評價。"));
            state.flags.caveUnlocked = true;
            state.recentOutcome = "你以精血點亮殘陣，終於從石台上取走那枚古修傳承令，代價則是胸口一整日都像被火燒。";
            addPathInfluence(state, { 魔道: 1, 霸道: 1 });
            addBiography(state, "你在古修洞府奪得傳承令，往後每一步都更像被古老目光注視。");
            return finalizeTurn(state);
          }),
          createOption("cave-cautious", "慢拆禁制", "穩健而慢，適合長線。", () => {
            applyStandardCosts(state, {
              months: 6,
              cultivation: 18,
              daoHeart: 6,
              divineSense: 6,
              materials: 2,
            });
            addItem(state, itemDetails("鎮心玉符", "符籙", "玄階", "面對心魔時略減魔念累積。"));
            state.recentOutcome = "你花了更久的時間拆開禁制，帶走的寶物雖不算最兇，卻最適合你眼下的道。";
            return finalizeTurn(state);
          }),
          createOption("cave-call-allies", "召同伴共探", "分走收益，但能提高安全與關係。", () => {
            const support = relation(state, "senior").affinity + relation(state, "master").trust >= 36;
            applyStandardCosts(state, {
              months: 4,
              cultivation: support ? 20 : 10,
              contribution: support ? 6 : 2,
              vitality: support ? -6 : -10,
              reputation: support ? 4 : 0,
            });
            adjustRelationship(state, "senior", { affinity: 4, trust: 3 });
            adjustRelationship(state, "master", { trust: 3 });
            state.recentOutcome = support
              ? "你沒有逞強，選擇與人共探。洞府收益雖被分薄，卻也因此換來更穩固的牽連。"
              : "你想喚人幫忙，最後只得到草草應付的支援，洞府裡多數真正的好處仍被旁人拿走。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "ancient-cave" }
      );
    },
  },
  {
    id: "village-repayment",
    category: "explore",
    weight: 8,
    condition: (state) => state.stats.karma >= 12 && ["凡塵鎮", "落月山脈"].includes(state.world.location),
    create(state) {
      return scene(
        "凡村來報恩",
        "你曾順手救過的一戶凡村人家帶著粗布包裹尋來。他們說村裡近來接連鬧邪祟，願意把祖傳線索與一個孩子的前程都託付給你。",
        [
          createOption("village-accept", "收下孩子為記名弟子", "開啟徒弟線與立宗潛力。", () => {
            relation(state, "disciple").unlocked = true;
            adjustRelationship(state, "disciple", { bond: 14, trust: 10, affinity: 10 });
            state.flags.acceptedDisciple = true;
            applyStandardCosts(state, {
              months: 3,
              karma: 6,
              reputation: 6,
              daoHeart: 4,
            });
            pushMemory(state, "你收下謝小河為記名弟子，第一次感到自己的道也能成為他人的路。");
            addBiography(state, "凡村把孩子託付於你，你自此第一次有了『徒弟』。");
            state.recentOutcome = "你接過那個瘦小少年的拜帖，忽然意識到，自己也開始成為別人的依靠。";
            return finalizeTurn(state);
          }),
          createOption("village-info", "只收線索不收人", "拿到情報，減少牽掛。", () => {
            applyStandardCosts(state, {
              months: 2,
              luck: 6,
              karma: 2,
              spiritStones: 6,
            });
            state.flags.caveUnlocked = true;
            state.recentOutcome = "你婉拒收徒，只拿走那張祖傳舊圖。村人感激依舊，心裡卻像少了點什麼。";
            return finalizeTurn(state);
          }),
          createOption("village-refuse", "婉拒牽掛", "守住求道之心，也會留下心中回音。", () => {
            applyStandardCosts(state, {
              months: 2,
              daoHeart: 2,
              karma: -2,
            });
            addPathInfluence(state, { 無情道: 1 });
            state.recentOutcome = "你最終沒有接下這份託付。回身離開時，仍聽見孩子在身後小聲喚了一句前輩。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "village-repayment" }
      );
    },
  },
  {
    id: "blood-realm",
    category: "explore",
    weight: 8,
    condition: (state) => state.world.chapter >= 4 && state.stats.realmIndex >= 1,
    create(state) {
      return scene(
        "血煞秘境開啟",
        "天地間忽有血色裂隙張開，各方勢力都在趕往入口。傳聞裡頭藏著能改寫金丹品質的古器，也埋著上一次開啟時整支隊伍的白骨。",
        [
          createOption("blood-enter", "獨自闖入奪寶", "高風險高回報。", () => {
            const win = resolveChallenge(state, 118 + state.stats.realmIndex * 12, { boss: true });
            applyStandardCosts(state, {
              months: 6,
              cultivation: win ? 36 : 16,
              materials: win ? 4 : 2,
              vitality: win ? -18 : -26,
              demonicIntent: win ? 4 : 8,
            });
            if (win) addItem(state, itemDetails("血煞殘印", "法寶", "地階", "衝突爆發時提升殺傷與資源收益。"));
            state.flags.bloodRealmSeen = true;
            state.recentOutcome = win
              ? "你從秘境深處帶出一枚血煞殘印，掌心發燙，像是也被它默默記住了。"
              : "你在秘境裡被逼到最後一條退路，雖活著逃出，卻明白自己仍不夠強。";
            return finalizeTurn(state);
          }),
          createOption("blood-alliance", "與同門結盟", "收益少些，安全許多。", () => {
            applyStandardCosts(state, {
              months: 6,
              cultivation: 24,
              contribution: 12,
              reputation: 8,
              vitality: -10,
            });
            adjustRelationship(state, "senior", { affinity: 6, trust: 3 });
            adjustRelationship(state, "master", { trust: 4 });
            state.flags.bloodRealmSeen = true;
            state.recentOutcome = "你沒有獨吞秘境，而是與同門結陣深入。此行雖少了最兇險的寶物，卻換來了更大的宗門聲望。";
            return finalizeTurn(state);
          }),
          createOption("blood-report", "先回宗門稟報", "以穩為主，為後續大事鋪路。", () => {
            applyStandardCosts(state, {
              months: 3,
              contribution: 14,
              reputation: 6,
              daoHeart: 4,
            });
            adjustRelationship(state, "master", { trust: 6 });
            state.flags.bloodRealmSeen = true;
            state.recentOutcome = "你沒有被眼前血光沖昏頭，而是先把消息帶回青雲宗，從此被視作可用之才。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "blood-realm" }
      );
    },
  },
  {
    id: "senior-tea",
    category: "relationship",
    weight: 11,
    condition: (state) => relation(state, "senior").unlocked,
    create(state) {
      return scene(
        "與林秋漪對坐",
        "夜深後的偏院茶煙淡淡。林秋漪把一盞清茶推到你面前，像是在等你先說今晚是為修行、為心事，還是為某一個人。",
        [
          createOption("senior-truth", "坦白近況", "加深信任，穩住道心。", () => {
            applyStandardCosts(state, {
              months: 2,
              daoHeart: 6,
              reputation: 2,
            });
            adjustRelationship(state, "senior", { affinity: 8, trust: 6, bond: 4 });
            state.recentOutcome = "你把最近的焦躁與猶疑都說了出來，茶還沒涼，心裡那點悶氣倒先散了。";
            return finalizeTurn(state);
          }),
          createOption("senior-help", "請她協助煉藥", "以人情換丹藥與突破資本。", () => {
            applyStandardCosts(state, {
              months: 3,
              pills: 2,
              herbs: -1,
              spiritStones: -4,
            });
            adjustRelationship(state, "senior", { affinity: 6, trust: 2 });
            state.recentOutcome = "林秋漪替你調了兩爐丹，火候拿捏得恰到好處。你欠下的，也從此不只是一份材料錢。";
            return finalizeTurn(state);
          }),
          createOption("senior-distance", "只談天象與陣理", "保留距離，換神識與無情道傾向。", () => {
            applyStandardCosts(state, {
              months: 2,
              divineSense: 6,
              daoHeart: 2,
            });
            addPathInfluence(state, { 無情道: 1 });
            state.recentOutcome = "你們談了一夜月相與陣紋，誰都沒有去碰那些真正動人心的部分。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "senior-tea" }
      );
    },
  },
  {
    id: "master-summons",
    category: "relationship",
    weight: 10,
    condition: (state) => relation(state, "master").unlocked,
    create(state) {
      return scene(
        "師尊傳召",
        "蘇清衡在劍閣外等你，身旁只有一柄插在地上的長劍。這種時候，他通常不會說廢話。",
        [
          createOption("master-report", "如實稟報近況", "穩住師徒線與正道走向。", () => {
            applyStandardCosts(state, {
              months: 2,
              daoHeart: 4,
              reputation: 2,
              cultivation: 12,
            });
            adjustRelationship(state, "master", { trust: 8, affinity: 4 });
            addPathInfluence(state, { 正道: 1 });
            state.recentOutcome = "蘇清衡聽完後只說了一句『還算清醒』，但你知道這已是難得的讚許。";
            return finalizeTurn(state);
          }),
          createOption("master-secret", "請求秘傳指點", "若信任夠高，可得到大收益。", () => {
            const enoughTrust = relation(state, "master").trust >= 22;
            applyStandardCosts(state, {
              months: 3,
              cultivation: enoughTrust ? 24 : 12,
              spiritualPower: enoughTrust ? 8 : 2,
              daoHeart: enoughTrust ? 4 : 0,
            });
            if (enoughTrust) {
              addItem(state, itemDetails("清衡劍意", "功法", "玄階", "外門大比與衝突事件成功率提高。"));
              addBiography(state, "蘇清衡親自傳你一縷劍意，這是師徒之間真正的承認。");
            }
            adjustRelationship(state, "master", { trust: enoughTrust ? 6 : 2 });
            state.recentOutcome = enoughTrust
              ? "蘇清衡將指尖抵在你眉心，一縷劍意如雪入海，讓你對出手時機的感知大變。"
              : "他沒有拒絕，只是讓你先去把根基打實。這不是羞辱，而是一種明確的要求。";
            return finalizeTurn(state);
          }),
          createOption("master-hide", "隱去真正野心", "保留自己的底牌。", () => {
            applyStandardCosts(state, {
              months: 2,
              cultivation: 14,
              demonicIntent: 4,
            });
            adjustRelationship(state, "master", { trust: -4 });
            addPathInfluence(state, { 霸道: 1, 無情道: 1 });
            state.recentOutcome = "你回話滴水不漏，卻也讓蘇清衡眼底那點本來不多的信任再淡了幾分。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "master-summons" }
      );
    },
  },
  {
    id: "rival-duel",
    category: "relationship",
    weight: 10,
    condition: (state) => relation(state, "rival").unlocked,
    create(state) {
      return scene(
        "顧長夜攔路",
        "顧長夜靠在石階邊，像是等了很久。他說自己最近又有所得，想看你究竟值不值得他一直盯著。",
        [
          createOption("rival-duel", "應下此戰", "用實力決定彼此位置。", () => {
            const win = resolveChallenge(state, 98 + relation(state, "rival").grudge * 0.4);
            applyStandardCosts(state, {
              months: 3,
              cultivation: win ? 18 : 12,
              vitality: win ? -6 : -12,
              reputation: win ? 6 : 1,
            });
            adjustRelationship(state, "rival", { grudge: win ? 8 : 4, affinity: win ? -2 : 0 });
            state.recentOutcome = win
              ? "你在石階前勝過顧長夜半招，這一戰沒有讓他服氣，卻讓他真正把你當成對手。"
              : "你輸了，卻輸得不算難看。顧長夜臨走時那句『下次再來』反而像是在認可你。";
            return finalizeTurn(state);
          }),
          createOption("rival-reconcile", "試圖化敵為友", "若時機對，也許能把宿敵變磨刀石。", () => {
            const success = relation(state, "rival").grudge <= 20 || state.stats.daoHeart >= 70;
            applyStandardCosts(state, {
              months: 2,
              daoHeart: success ? 4 : -2,
              reputation: success ? 4 : 0,
            });
            adjustRelationship(state, "rival", {
              grudge: success ? -10 : 2,
              affinity: success ? 6 : -2,
              trust: success ? 4 : 0,
            });
            state.recentOutcome = success
              ? "顧長夜沉默了很久，最終只說『下次別再讓我先開口』。看來你們之間總算不是只剩敵意。"
              : "你想把劍收回鞘裡，對方卻只當你心虛。這一步暫時還走不通。";
            return finalizeTurn(state);
          }),
          createOption("rival-exploit", "趁其受傷壓上一腳", "短期收益高，因果更重。", () => {
            applyStandardCosts(state, {
              months: 2,
              spiritStones: 16,
              reputation: -6,
              demonicIntent: 8,
            });
            adjustRelationship(state, "rival", { grudge: 16 });
            addPathInfluence(state, { 霸道: 2, 魔道: 1 });
            state.recentOutcome = "你沒有給顧長夜喘息的機會，當場奪走了他手裡那瓶靈液。這一腳踩下去，往後就是死仇。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "rival-duel" }
      );
    },
  },
  {
    id: "merchant-alliance",
    category: "relationship",
    weight: 9,
    condition: (state) => relation(state, "merchant").unlocked,
    create(state) {
      return scene(
        "沈萬錢的邀約",
        "沈萬錢把帳簿往你面前一攤，笑得像是什麼都沒說，又像什麼都已經說完。他想知道你要當買家、靠山，還是合作夥伴。",
        [
          createOption("merchant-invest", "追加靈石合作", "提高長線資金與坊市影響力。", () => {
            const stake = Math.min(30, state.resources.spiritStones);
            spendResource(state, "spiritStones", stake);
            applyStandardCosts(state, {
              months: 3,
              spiritStones: Math.round(stake * 1.6),
              reputation: 2,
            });
            adjustRelationship(state, "merchant", { affinity: 8, trust: 6 });
            state.flags.allianceWithMerchant = true;
            state.recentOutcome = `你又押出 ${stake} 枚靈石。沈萬錢辦事依舊油滑，卻確實替你把銀錢滾得更大。`;
            return finalizeTurn(state);
          }),
          createOption("merchant-favor", "請他幫你找物", "換取突破或洞府相關道具。", () => {
            spendResource(state, "spiritStones", 16);
            applyStandardCosts(state, {
              months: 2,
              pills: 1,
              materials: 2,
              luck: 4,
            });
            adjustRelationship(state, "merchant", { affinity: 4, trust: 4 });
            state.recentOutcome = "三日後，沈萬錢派人送來你要的東西，還額外附了一張寫著『以後常來』的薄紙。";
            return finalizeTurn(state);
          }),
          createOption("merchant-refuse", "不再加深往來", "守住清白，也錯過一條捷徑。", () => {
            applyStandardCosts(state, {
              months: 1,
              daoHeart: 2,
            });
            addPathInfluence(state, { 正道: 1, 無情道: 1 });
            state.recentOutcome = "你把帳簿推了回去。沈萬錢只笑，不勸，也不追，像是在等你之後自己回頭。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "merchant-alliance" }
      );
    },
  },
  {
    id: "mortal-tether",
    category: "relationship",
    weight: 8,
    condition: (state) => relation(state, "mortal").unlocked && currentYear(state) >= 3,
    create(state) {
      return scene(
        "凡塵牽掛",
        "阿寧寄來一封手書，字跡比你記憶中還要生澀。信裡只問你近來可安，卻在末尾輕輕提了一句：家鄉近來不太平。",
        [
          createOption("mortal-return", "親自回去看看", "加深因果與正道線。", () => {
            changeLocation(state, "凡塵鎮");
            applyStandardCosts(state, {
              months: 4,
              karma: 6,
              daoHeart: 6,
              reputation: 4,
            });
            adjustRelationship(state, "mortal", { bond: 10, trust: 6, affinity: 4 });
            state.flags.rescuedVillagers = true;
            state.recentOutcome = "你回到凡塵鎮，替故人與鄉里擋下了一場邪祟。那一夜，你忽然明白修行不是只有向上。";
            addBiography(state, "你曾返鄉護住舊識與鄉里，因此在凡塵留下了極深善名。");
            addPathInfluence(state, { 正道: 2 });
            return finalizeTurn(state);
          }),
          createOption("mortal-send", "託人送去資源", "保留牽掛但不親自涉入。", () => {
            spendResource(state, "spiritStones", 10);
            applyStandardCosts(state, {
              months: 2,
              karma: 2,
              reputation: 2,
            });
            adjustRelationship(state, "mortal", { bond: 6, trust: 4 });
            state.recentOutcome = "你沒有親自回去，只把靈石與符紙託人送往家鄉。信很快回來，字裡行間滿是感激。";
            return finalizeTurn(state);
          }),
          createOption("mortal-sever", "斷去塵緣", "斬斷牽掛，換取更冷的道心。", () => {
            applyStandardCosts(state, {
              months: 2,
              daoHeart: 4,
              karma: -4,
            });
            adjustRelationship(state, "mortal", { bond: -10, trust: -8 });
            addPathInfluence(state, { 無情道: 2 });
            state.recentOutcome = "你把那封信燒成灰。火光裡沒有誰怪你，卻也讓你心裡最柔軟的一處跟著安靜下來。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "mortal-tether" }
      );
    },
  },
  {
    id: "disciple-request",
    category: "relationship",
    weight: 8,
    condition: (state) => state.flags.acceptedDisciple,
    create(state) {
      return scene(
        "謝小河請教",
        "謝小河抱著木劍站在門外，明明才剛入門，眼裡卻藏不住想追上你的光。他想知道，是該先練劍，還是先學做人。",
        [
          createOption("disciple-teach", "耐心教他根基", "降低立竿見影收益，換穩固徒弟線。", () => {
            applyStandardCosts(state, {
              months: 3,
              daoHeart: 6,
              reputation: 4,
              cultivation: 8,
            });
            adjustRelationship(state, "disciple", { bond: 8, trust: 10, affinity: 6 });
            state.recentOutcome = "你用最基礎的姿勢磨了謝小河整整三日。少年雖累得直抖，眼神卻比來時更亮。";
            return finalizeTurn(state);
          }),
          createOption("disciple-use", "讓他替你奔走", "把徒弟當資源，收益高但傷人心。", () => {
            applyStandardCosts(state, {
              months: 2,
              spiritStones: 10,
              contribution: 6,
              demonicIntent: 6,
            });
            adjustRelationship(state, "disciple", { bond: -8, trust: -10 });
            addPathInfluence(state, { 霸道: 1, 魔道: 1 });
            state.recentOutcome = "謝小河替你跑完了三個差事，回來時滿頭是汗。你得了便利，卻也看見他眼底第一次浮出失望。";
            return finalizeTurn(state);
          }),
          createOption("disciple-let-go", "讓他另尋師門", "減輕牽掛，保住對方前程。", () => {
            applyStandardCosts(state, {
              months: 2,
              daoHeart: 2,
              reputation: 2,
            });
            adjustRelationship(state, "disciple", { bond: 4, trust: 2 });
            state.recentOutcome = "你把謝小河送去更適合他的峰頭。雖然少了一條牽連，卻也少了一份會拖累彼此的錯路。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "disciple-request" }
      );
    },
  },
  {
    id: "heavenly-tribulation",
    category: "cultivate",
    weight: 9,
    condition: (state) => state.flags.thunderTempered && state.stats.realmIndex >= 2 && state.stats.cultivation >= realmData(state).nextThreshold - 20,
    create(state) {
      return scene(
        "天劫問心",
        "雷雲在天際聚成一口倒懸的大鐘。你知道這不只是對修為的考驗，也是對所有選擇的回收。",
        [
          createOption("tribulation-face", "直面雷劫", "正面渡劫，最看根基與道心。", () => {
            const success = resolveChallenge(state, 126 + state.stats.realmIndex * 16, { righteous: true, boss: true });
            applyStandardCosts(state, {
              months: 5,
              vitality: success ? -14 : -28,
              daoHeart: success ? 10 : -8,
              cultivation: success ? 24 : 8,
            });
            state.recentOutcome = success
              ? "你在雷光裡看見了過往所有執念，最後仍提劍向前。天劫沒有饒你，但你也沒有退。"
              : "你被雷光逼得幾近跪下，最終雖留住性命，心裡那道裂痕卻比肉身還深。";
            return finalizeTurn(state);
          }),
          createOption("tribulation-treasure", "借古修傳承令", "若手中有重寶，可穩住局勢。", () => {
            const hasTreasure = hasItem(state, "古修傳承令");
            const success = resolveChallenge(state, hasTreasure ? 110 : 136, { boss: true });
            applyStandardCosts(state, {
              months: 4,
              vitality: success ? -10 : -24,
              daoHeart: success ? 8 : -6,
              cultivation: success ? 20 : 6,
            });
            if (hasTreasure) {
              removeItem(state, "古修傳承令");
            }
            state.recentOutcome = success
              ? "傳承令在雷光中替你擋下了最致命的一擊，也在完成使命後碎成了粉末。"
              : "你祭出寶物仍沒完全壓住雷意，只能帶著焦黑傷口與殘存喘息跌回地面。";
            return finalizeTurn(state);
          }),
          createOption("tribulation-karma", "以因果立誓", "若善惡未清，效果會截然不同。", () => {
            const righteous = state.stats.karma >= 12;
            applyStandardCosts(state, {
              months: 4,
              vitality: righteous ? -12 : -20,
              daoHeart: righteous ? 10 : -4,
              demonicIntent: righteous ? -6 : 6,
              cultivation: righteous ? 18 : 10,
            });
            state.recentOutcome = righteous
              ? "你在雷劫前立誓不負曾經救過的人。那一刻，天意像真的因此為你留下了一線。"
              : "你想借誓言騙過天劫，卻被過往未了的因果反噬。雷光落下時，比先前更狠。";
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "heavenly-tribulation" }
      );
    },
  },
  {
    id: "sect-crisis",
    category: "sect",
    weight: 8,
    condition: (state) => state.world.chapter >= 5 && !state.flags.sectCrisisResolved,
    create(state) {
      return scene(
        "青雲宗劫變",
        "黑風谷一線勢力聯手試探青雲宗護山大陣。宗門內外一片急令，有人主張死守，有人主張先撤有生力量。你終於被推到真正會改變大局的位置。",
        [
          createOption("crisis-defend", "守山門", "搏一場名望與信念。", () => {
            const success = resolveChallenge(state, 120 + state.stats.realmIndex * 18, { righteous: true, boss: true });
            applyStandardCosts(state, {
              months: 6,
              reputation: success ? 16 : 8,
              contribution: success ? 24 : 12,
              vitality: success ? -18 : -28,
              daoHeart: success ? 8 : -4,
            });
            adjustRelationship(state, "master", { trust: success ? 10 : 4 });
            state.flags.sectCrisisResolved = true;
            state.recentOutcome = success
              ? "你在山門前一戰成名，護山陣光落盡時，青雲宗上下都知道這次是你把大勢撐住了。"
              : "你守住了大半弟子撤離，卻沒能讓山門毫髮無損。即便如此，仍有人因此欠了你一條命。";
            addBiography(state, "青雲宗劫變時，你站在最前面，從此真正被視作宗門中堅。");
            return finalizeTurn(state);
          }),
          createOption("crisis-escort", "護送弟子撤離", "少一些威名，多一些人情與延續。", () => {
            applyStandardCosts(state, {
              months: 5,
              reputation: 10,
              contribution: 16,
              karma: 8,
              vitality: -12,
            });
            adjustRelationship(state, "disciple", { bond: 6, trust: 6 });
            state.flags.sectCrisisResolved = true;
            state.recentOutcome = "你沒有去爭最耀眼的那條戰線，而是帶著年輕弟子們活著衝出山門。這份功勞不夠張揚，卻足夠重。";
            addPathInfluence(state, { 正道: 2, 逍遙道: 1 });
            return finalizeTurn(state);
          }),
          createOption("crisis-seize", "趁亂奪取資源", "一旦成功，後續就會完全不同。", () => {
            applyStandardCosts(state, {
              months: 4,
              spiritStones: 40,
              materials: 4,
              reputation: -16,
              demonicIntent: 12,
            });
            adjustRelationship(state, "master", { trust: -14 });
            adjustRelationship(state, "merchant", { affinity: 6 });
            state.flags.sectCrisisResolved = true;
            state.recentOutcome = "混亂裡，你把一批本該送往內庫的資源轉進了自己的手中。這一步換來的不是光，而是另一條更暗的路。";
            addPathInfluence(state, { 霸道: 2, 魔道: 1 });
            return finalizeTurn(state);
          }),
        ],
        { kind: "event", eventId: "sect-crisis" }
      );
    },
  },
];

const FALLBACK_EVENTS = {
  cultivate(state) {
    return scene(
      "靜室小關",
      genericTrainingBody(state),
      [
        createOption("fallback-cultivate", "按部就班吐納", "穩定推進修為與道心。", () => {
          applyStandardCosts(state, {
            months: 4,
            cultivation: 16,
            daoHeart: 3,
            vitality: 2,
          });
          state.recentOutcome = "你把每一次呼吸都理順，雖無驚喜，卻在悄無聲息中走得更遠。";
          return finalizeTurn(state);
        }),
        createOption("fallback-cultivate-pill", "吞服丹藥精進", "消耗丹藥，換更高效率。", () => {
          if (state.resources.pills > 0) {
            spendResource(state, "pills", 1);
            applyStandardCosts(state, {
              months: 3,
              cultivation: 24,
              vitality: 4,
            });
            state.recentOutcome = "丹力化開後，你的靈力一口氣上衝半截，省下不少苦功。";
          } else {
            applyStandardCosts(state, {
              months: 3,
              cultivation: 12,
              daoHeart: 2,
            });
            state.recentOutcome = "你本想借丹藥省時，卻發現瓶中已空，只能老老實實重回吐納。";
          }
          return finalizeTurn(state);
        }),
        createOption("fallback-cultivate-rest", "養傷靜心", "恢復氣血，略減魔念。", () => {
          applyStandardCosts(state, {
            months: 3,
            vitality: 14,
            daoHeart: 4,
            demonicIntent: -4,
          });
          state.recentOutcome = "你終於放慢腳步，把積累許久的暗傷與雜念都一點點壓了下去。";
          return finalizeTurn(state);
        }),
      ],
      { kind: "event", eventId: "fallback-cultivate" }
    );
  },
  sect(state) {
    return scene(
      "宗門雜務",
      "山門裡總有做不完的差事，雖不驚天動地，卻是積累名分與人情最穩妥的方式。",
      [
        createOption("fallback-sect-task", "接取日常任務", "換取貢獻與少量靈石。", () => {
          applyStandardCosts(state, {
            months: 3,
            contribution: 8,
            spiritStones: 10,
            cultivation: 10,
          });
          state.recentOutcome = "你把幾項雜務做得滴水不漏，雖無人喝彩，貢獻簿上的數字卻實打實在往上走。";
          return finalizeTurn(state);
        }),
        createOption("fallback-sect-library", "巡守藏經閣", "提高聲望與神識。", () => {
          applyStandardCosts(state, {
            months: 2,
            contribution: 6,
            reputation: 4,
            divineSense: 4,
          });
          state.recentOutcome = "你替宗門巡守一輪藏經閣，期間順手記住了不少旁人容易漏看的細節。";
          return finalizeTurn(state);
        }),
        createOption("fallback-sect-rest", "回峰頭待命", "保留體力，順手拉近師門關係。", () => {
          applyStandardCosts(state, {
            months: 2,
            vitality: 8,
            daoHeart: 2,
          });
          adjustRelationship(state, "master", { trust: 2 });
          state.recentOutcome = "你沒有四處出頭，而是老老實實守在峰頭。師門記得這樣的穩重。";
          return finalizeTurn(state);
        }),
      ],
      { kind: "event", eventId: "fallback-sect" }
    );
  },
  explore(state) {
    return scene(
      "尋常探路",
      "沒有每一次外出都會撞上大機緣，但路走得多了，總會把真正屬於你的那一道風景踩出來。",
      [
        createOption("fallback-explore-search", "沿路搜索", "穩定收集材料與些許修為。", () => {
          applyStandardCosts(state, {
            months: 3,
            materials: 1,
            herbs: 1,
            cultivation: 10,
            vitality: -4,
          });
          state.recentOutcome = `你在 ${state.world.location} 來回搜尋半日，雖無奇蹟，仍帶回了一些足夠慢慢堆底蘊的材料。`;
          return finalizeTurn(state);
        }),
        createOption("fallback-explore-watch", "先觀後動", "提高福緣與後續權重。", () => {
          applyStandardCosts(state, {
            months: 2,
            luck: 6,
            divineSense: 4,
          });
          state.recentOutcome = "你把更多時間用在觀察地勢與人心，暫時沒有收穫，卻感到下一場機緣已在暗處靠近。";
          return finalizeTurn(state);
        }),
        createOption("fallback-explore-trade", "把零碎戰利賣掉", "換點靈石，減少累贅。", () => {
          applyStandardCosts(state, {
            months: 2,
            spiritStones: 12,
            materials: -1,
            reputation: 1,
          });
          state.recentOutcome = "你把手邊一些零碎戰利換成靈石，袋子輕了些，下一次出門也更方便。";
          return finalizeTurn(state);
        }),
      ],
      { kind: "event", eventId: "fallback-explore" }
    );
  },
  relationship(state) {
    return scene(
      "一封舊信與幾杯清茶",
      "修行不只有境界，還有人與人之間拉不斷、也斷不乾淨的線。你決定把時間花在哪一條上。",
      [
        createOption("fallback-relationship-master", "去劍閣問安", "穩步拉近師徒信任。", () => {
          applyStandardCosts(state, {
            months: 2,
            daoHeart: 2,
            cultivation: 8,
          });
          adjustRelationship(state, "master", { trust: 4, affinity: 2 });
          state.recentOutcome = "你在劍閣外站了一炷香時間，只換來一句淡淡的『可』，卻也夠你高興一陣。";
          return finalizeTurn(state);
        }),
        createOption("fallback-relationship-senior", "與同門閒談", "小幅增加關係與聲望。", () => {
          applyStandardCosts(state, {
            months: 2,
            reputation: 2,
            daoHeart: 2,
          });
          adjustRelationship(state, "senior", { affinity: 4, trust: 2 });
          state.recentOutcome = "你與同門在廊下談了一夜，沒有驚心動魄，卻讓許多名字變得不那麼陌生。";
          return finalizeTurn(state);
        }),
        createOption("fallback-relationship-alone", "獨自整理舊事", "更偏向無情與逍遙。", () => {
          applyStandardCosts(state, {
            months: 2,
            daoHeart: 4,
            divineSense: 2,
          });
          addPathInfluence(state, { 無情道: 1, 逍遙道: 1 });
          state.recentOutcome = "你把話都留在心裡，反倒因此聽清了自己真正想要的是什麼。";
          return finalizeTurn(state);
        }),
      ],
      { kind: "event", eventId: "fallback-relationship" }
    );
  },
};

export function createDefaultDraft() {
  return {
    name: QUICK_START_PROFILE.name,
    origin: QUICK_START_PROFILE.origin,
    root: QUICK_START_PROFILE.root,
    personality: QUICK_START_PROFILE.personality,
    destiny: QUICK_START_PROFILE.destiny,
  };
}

export function randomizeDraft() {
  const name = `${NAME_PREFIX[Math.floor(Math.random() * NAME_PREFIX.length)]}${NAME_SUFFIX[Math.floor(Math.random() * NAME_SUFFIX.length)]}`;
  return {
    name,
    origin: ORIGINS[Math.floor(Math.random() * ORIGINS.length)].id,
    root: ROOTS[Math.floor(Math.random() * ROOTS.length)].id,
    personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)].id,
    destiny: DESTINIES[Math.floor(Math.random() * DESTINIES.length)].id,
  };
}

export function getQuickStartProfile() {
  return clone(QUICK_START_PROFILE);
}

export function getCharacterOptions() {
  return {
    origins: clone(ORIGINS),
    roots: clone(ROOTS),
    personalities: clone(PERSONALITIES),
    destinies: clone(DESTINIES),
  };
}

export function createNewGame(profile) {
  const safeName = (profile.name || QUICK_START_PROFILE.name).trim() || QUICK_START_PROFILE.name;
  const normalized = {
    name: safeName,
    origin: profile.origin,
    root: profile.root,
    personality: profile.personality,
    destiny: profile.destiny,
  };
  const seed = hashString(`${safeName}-${Date.now()}-${profile.origin}-${profile.root}`);
  return createBaseState(normalized, seed);
}

export function createSceneFromState(state) {
  if (state.storyPhase === "prologue") return buildPrologueScene(state);
  return buildHubScene(state);
}

export function serializeGame(state) {
  return clone(state);
}

export function hydrateGame(raw) {
  const fallback = createBaseState(getQuickStartProfile(), hashString("fallback"));
  const state = {
    ...fallback,
    ...clone(raw),
  };
  state.profile = { ...fallback.profile, ...raw.profile };
  state.world = { ...fallback.world, ...raw.world };
  state.stats = { ...fallback.stats, ...raw.stats };
  state.resources = { ...fallback.resources, ...raw.resources };
  state.flags = { ...fallback.flags, ...raw.flags };
  state.cooldowns = raw.cooldowns || {};
  state.eventCounts = raw.eventCounts || {};
  state.memories = Array.isArray(raw.memories) ? raw.memories.slice(0, 8) : fallback.memories;
  state.biography = Array.isArray(raw.biography) ? raw.biography.slice(0, 20) : fallback.biography;
  state.inventory = Array.isArray(raw.inventory) ? raw.inventory : fallback.inventory;
  state.pathScores = { ...fallback.pathScores, ...(raw.pathScores || {}) };
  state.relationships = clone(fallback.relationships);
  for (const [id, value] of Object.entries(raw.relationships || {})) {
    if (state.relationships[id]) {
      state.relationships[id] = { ...state.relationships[id], ...value };
    }
  }
  refreshDerivedState(state);
  return state;
}

export function loadSaves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSaves(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildSaveSnapshot(state) {
  return {
    savedAt: new Date().toISOString(),
    preview: {
      name: state.profile.name,
      realm: realmData(state).id,
      age: formatAge(state),
      location: state.world.location,
      chapter: currentChapterTitle(state),
      daoPath: state.daoPath,
      reputation: state.stats.reputation,
    },
    state: serializeGame(state),
  };
}

export function saveToSlot(slotId, state) {
  const saves = loadSaves();
  saves[slotId] = buildSaveSnapshot(state);
  writeSaves(saves);
  return saves;
}

export function deleteSaveSlot(slotId) {
  const saves = loadSaves();
  delete saves[slotId];
  writeSaves(saves);
  return saves;
}

export function loadFromSlot(slotId) {
  const saves = loadSaves();
  if (!saves[slotId]) return null;
  return hydrateGame(saves[slotId].state);
}

export function getGameViewModel(state) {
  return {
    header: {
      name: state.profile.name,
      realm: realmData(state).id,
      age: formatAge(state),
      location: state.world.location,
      chapter: currentChapterTitle(state),
      daoPath: state.daoPath,
      sectRank: state.world.sectRank,
      summary: statSummary(state),
    },
    resources: [
      { label: "靈石", value: state.resources.spiritStones },
      { label: "丹藥", value: state.resources.pills },
      { label: "材料", value: state.resources.materials },
      { label: "貢獻", value: state.resources.contribution },
      { label: "福緣", value: state.stats.luck },
      { label: "魔念", value: state.stats.demonicIntent },
    ],
    stats: [
      { label: "修為", value: `${state.stats.cultivation} / ${realmData(state).nextThreshold}` },
      { label: "氣血", value: state.stats.vitality },
      { label: "靈力", value: state.stats.spiritualPower },
      { label: "神識", value: state.stats.divineSense },
      { label: "道心", value: state.stats.daoHeart },
      { label: "壽元", value: Math.round(state.stats.lifespan - state.stats.age) },
      { label: "因果", value: state.stats.karma },
      { label: "聲望", value: state.stats.reputation },
    ],
    inventory: state.inventory
      .slice()
      .reverse()
      .map((item) => ({
        title: `${item.name}．${item.quality}`,
        copy: `${item.type}｜${item.effect}`,
      })),
    relationships: Object.values(state.relationships)
      .filter((entry) => entry.unlocked)
      .sort((left, right) => right.bond + right.affinity - (left.bond + left.affinity))
      .map((entry) => ({
        title: `${entry.name}．${entry.role}`,
        copy: `好感 ${entry.affinity}｜信任 ${entry.trust}｜牽連 ${entry.bond}｜仇怨 ${entry.grudge}`,
      })),
    biography: state.biography.map((text) => ({ title: text.split("：")[0], copy: text })),
    memories: state.memories,
  };
}

export function getCodexSections() {
  return clone(CODEX_SECTIONS);
}

export function getLocationCards() {
  return clone(LOCATIONS);
}

export function getDaoPathCards() {
  return clone(DAO_PATHS);
}

export function getSavePreview(slot) {
  if (!slot) return null;
  return slot.preview;
}

export function getRenderState(state, sceneData, appMode, selectedOptionIndex, activeTab) {
  const scene = sceneData || createSceneFromState(state);
  return JSON.stringify(
    {
      mode: appMode,
      scene: scene.title,
      chapter: currentChapterTitle(state),
      location: state.world.location,
      realm: realmData(state).id,
      daoPath: state.daoPath,
      age: formatAge(state),
      selectedOptionIndex,
      activeTab,
      coordinateSystem: "非空間敘事介面，無平面座標。",
      resources: {
        spiritStones: state.resources.spiritStones,
        pills: state.resources.pills,
        materials: state.resources.materials,
        contribution: state.resources.contribution,
      },
      stats: {
        cultivation: state.stats.cultivation,
        vitality: state.stats.vitality,
        spiritualPower: state.stats.spiritualPower,
        divineSense: state.stats.divineSense,
        daoHeart: state.stats.daoHeart,
        karma: state.stats.karma,
        reputation: state.stats.reputation,
        demonicIntent: state.stats.demonicIntent,
      },
      options: scene.options.map((option) => option.label),
      latestMemory: describeRecentMemory(state),
    },
    null,
    2
  );
}

let aiEnhancementCache = new Map();

export async function enhanceSceneWithAI(state, scene) {
  const sceneKey = `${scene.eventId || "hub"}-${state.world.location}-${state.stats.cultivation}`;

  if (aiEnhancementCache.has(sceneKey)) {
    return aiEnhancementCache.get(sceneKey);
  }

  const context = buildContext(state, scene);
  const aiText = await generateSceneText(context);

  if (!aiText) {
    return null;
  }

  const enhanced = {
    ...scene,
    aiTitle: aiText.title,
    aiBody: aiText.body,
    aiOptions: aiText.options?.map((opt, idx) => ({
      label: opt.label,
      copy: opt.copy,
    })),
  };

  if (aiEnhancementCache.size > 50) {
    const firstKey = aiEnhancementCache.keys().next().value;
    aiEnhancementCache.delete(firstKey);
  }
  aiEnhancementCache.set(sceneKey, enhanced);

  return enhanced;
}

export function clearAIEnhancementCache() {
  aiEnhancementCache.clear();
}
