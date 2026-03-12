/**
 * Vercel API Route: Generate Scene Text
 * Uses OpenRouter API to generate narrative text for game scenes
 */

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `你是一位修仙小說的說書人，專門為文字冒險遊戲撰寫情境描述。

請根據以下遊戲狀態生成情境文本：

## 輸出格式（JSON）
{
  "title": "場景標題",
  "body": "情境描述（2-4句話，富有畫面感和氛圍）",
  "options": [
    {"label": "選項標題", "copy": "選項描述"}
  ]
}

## 規則
1. 使用**繁體中文**
2. 語氣要像傳統修仙小说的章節開頭，富有意境
3. 選項要有明確的代價與收獲，呼應玩家狀態
4. 根據玩家的道途(正道/霸道/魔道/無情道/逍遙道)調整語氣和選項
5. 結合玩家的出身、性格、命格來豐富敘事
6. 不要超過4個選項
7. 只輸出JSON，不要有其他文字`;

export async function POST(request) {
  try {
    const context = await request.json();

    const userPrompt = generateUserPrompt(context);
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return Response.json({
        error: "API key not configured",
        fallback: true
      }, { status: 503 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://fanchen-wendao.vercel.app',
        'X-Title': '凡塵問道'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      return Response.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json({ error: 'No content generated' }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(content);
      return Response.json(parsed);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, content);
      return Response.json({ error: 'Invalid JSON from AI' }, { status: 500 });
    }

  } catch (error) {
    console.error('API route error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function generateUserPrompt(context) {
  return `## 玩家狀態
- 名字：${context.playerName}
- 出身：${context.origin}
- 靈根：${context.root}
- 性格：${context.personality}
- 命格：${context.destiny}
- 境界：${context.realm}
- 所在地：${context.location}
- 道途：${context.daoPath}
- 修為：${context.cultivation}
- 道心：${context.daoHeart}／魔念：${context.demonicIntent}
- 靈石：${context.spiritStones}
- 聲望：${context.reputation}
- 幸運：${context.luck}

## 當前場景
- 事件ID：${context.eventId}
- 標題：${context.eventTitle}

## 近期記憶
${context.recentMemory}

## 近期回響
${context.recentOutcome}

## 關係網絡
${context.relationships || "尚無深厚羈絆"}

---

請生成這個場景的敘事文本和選項。`;
}