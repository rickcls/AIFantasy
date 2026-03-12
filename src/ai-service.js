/**
 * AI Service Module
 * Handles communication with the AI backend for scene text generation
 * Falls back to hardcoded content if API is unavailable
 */

const CACHE = new Map();
const CACHE_MAX_SIZE = 100;

function getCacheKey(context) {
  return `${context.eventId}-${context.location}-${context.daoPath}-${context.realm}`;
}

function setCache(key, data) {
  if (CACHE.size >= CACHE_MAX_SIZE) {
    const firstKey = CACHE.keys().next().value;
    CACHE.delete(firstKey);
  }
  CACHE.set(key, data);
}

function getCached(key) {
  return CACHE.get(key);
}

export function buildContext(gameState, scene) {
  const { profile, stats, resources, world, pathScores, relationships, memories } = gameState;
  const daoPath = Object.entries(pathScores).sort((a, b) => b[1] - a[1])[0]?.[0] || "正道";

  return {
    eventId: scene?.eventId || "hub",
    eventTitle: scene?.title || "行旅",
    playerName: profile.name,
    origin: profile.origin,
    root: profile.root,
    personality: profile.personality,
    destiny: profile.destiny,
    realm: world.realm,
    location: world.location,
    daoPath,
    cultivation: stats.cultivation,
    daoHeart: stats.daoHeart,
    demonicIntent: stats.demonicIntent,
    reputation: stats.reputation,
    luck: stats.luck,
    spiritStones: resources.spiritStones,
    recentMemory: memories[0] || "沒有名為記憶的東西。",
    recentOutcome: gameState.recentOutcome || "尚無回響。",
    relationships: Object.entries(relationships)
      .filter(([, data]) => data.unlocked || data.affinity > 5)
      .map(([id, data]) => `${id}: 好感${data.affinity}, 信任${data.trust}`)
      .join("; "),
  };
}

export async function generateSceneText(context) {
  const cacheKey = getCacheKey(context);
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch("/api/generate-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      console.warn("AI API returned error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.title && data.body) {
      setCache(cacheKey, data);
      return data;
    }

    return null;
  } catch (error) {
    console.warn("AI service unavailable:", error.message);
    return null;
  }
}

export function clearCache() {
  CACHE.clear();
}

export function isCacheEnabled() {
  return true;
}