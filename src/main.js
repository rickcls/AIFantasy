import {
  AUTOSAVE_SLOT,
  MANUAL_SAVE_SLOTS,
  createDefaultDraft,
  createNewGame,
  createSceneFromState,
  deleteSaveSlot,
  getCharacterOptions,
  getCodexSections,
  getDaoPathCards,
  getGameViewModel,
  getLocationCards,
  getQuickStartProfile,
  getRenderState,
  getSavePreview,
  hydrateGame,
  loadFromSlot,
  loadSaves,
  randomizeDraft,
  saveToSlot,
  enhanceSceneWithAI,
} from "./game-engine.js";

const appRoot = document.querySelector("#app");
const characterOptions = getCharacterOptions();
const codeSections = getCodexSections();
const locationCards = getLocationCards();
const daoPathCards = getDaoPathCards();

const appState = {
  mode: "home",
  returnMode: "home",
  draft: createDefaultDraft(),
  game: null,
  scene: null,
  aiScene: null,
  ending: null,
  selectedOptionIndex: 0,
  activeTab: "status",
  saves: loadSaves(),
};

function setMode(mode) {
  appState.mode = mode;
  appState.selectedOptionIndex = 0;
  render();
}

function refreshSaves() {
  appState.saves = loadSaves();
}

async function enhanceCurrentScene() {
  if (!appState.game || !appState.scene) return;

  const enhanced = await enhanceSceneWithAI(appState.game, appState.scene);
  if (enhanced && enhanced.aiBody) {
    appState.aiScene = enhanced;
    render();
  }
}

function startGameFromProfile(profile) {
  appState.game = createNewGame(profile);
  appState.scene = createSceneFromState(appState.game);
  appState.aiScene = null;
  appState.mode = "game";
  appState.activeTab = "status";
  appState.ending = null;
  appState.selectedOptionIndex = 0;
  persistAutosave();
  render();
  enhanceCurrentScene();
}

function persistAutosave() {
  if (!appState.game) return;
  refreshSaves();
  appState.saves = saveToSlot(AUTOSAVE_SLOT, appState.game);
}

function handleTransition(result) {
  if (!result) {
    appState.scene = createSceneFromState(appState.game);
    appState.aiScene = null;
    persistAutosave();
    render();
    enhanceCurrentScene();
    return;
  }
  if (result.ending) {
    appState.ending = result.ending;
    appState.mode = "ending";
    appState.selectedOptionIndex = 0;
    persistAutosave();
    render();
    return;
  }
  appState.scene = result;
  appState.aiScene = null;
  appState.mode = "game";
  appState.selectedOptionIndex = 0;
  persistAutosave();
  render();
  enhanceCurrentScene();
}

function chooseOption(index) {
  if (!appState.scene) return;
  const options = appState.scene.options;
  if (!options || !options[index]) return;
  const option = options[index];
  const result = option.onChoose();
  handleTransition(result);
}

function loadGame(slotId) {
  const loaded = loadFromSlot(slotId);
  if (!loaded) return;
  appState.game = hydrateGame(loaded);
  appState.scene = createSceneFromState(appState.game);
  appState.aiScene = null;
  appState.mode = "game";
  appState.ending = null;
  appState.selectedOptionIndex = 0;
  appState.activeTab = "status";
  persistAutosave();
  render();
  enhanceCurrentScene();
}

function saveGame(slotId) {
  if (!appState.game) return;
  appState.saves = saveToSlot(slotId, appState.game);
  render();
}

function deleteSave(slotId) {
  appState.saves = deleteSaveSlot(slotId);
  render();
}

function openSaves(fromMode) {
  appState.returnMode = fromMode;
  refreshSaves();
  appState.mode = "saves";
  appState.selectedOptionIndex = 0;
  render();
}

function openCodex(fromMode) {
  appState.returnMode = fromMode;
  appState.mode = "codex";
  appState.selectedOptionIndex = 0;
  render();
}

function returnFromOverlay() {
  if (appState.returnMode === "game" && appState.game) {
    appState.mode = "game";
  } else {
    appState.mode = "home";
  }
  render();
}

function attachEvents() {
  appRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "quick-start") {
        startGameFromProfile(getQuickStartProfile());
      }
      if (action === "open-creator") {
        appState.mode = "creator";
        appState.selectedOptionIndex = 0;
        render();
      }
      if (action === "open-saves") {
        openSaves(button.dataset.from || appState.mode);
      }
      if (action === "open-codex") {
        openCodex(button.dataset.from || appState.mode);
      }
      if (action === "go-home") {
        appState.mode = "home";
        appState.game = null;
        appState.scene = null;
        appState.ending = null;
        appState.selectedOptionIndex = 0;
        render();
      }
      if (action === "return-overlay") {
        returnFromOverlay();
      }
      if (action === "randomize-draft") {
        appState.draft = randomizeDraft();
        render();
      }
      if (action === "start-custom") {
        startGameFromProfile(appState.draft);
      }
      if (action === "new-cycle") {
        startGameFromProfile(getQuickStartProfile());
      }
      if (action === "save-slot") {
        saveGame(button.dataset.slot);
      }
      if (action === "load-slot") {
        loadGame(button.dataset.slot);
      }
      if (action === "delete-slot") {
        deleteSave(button.dataset.slot);
      }
      if (action === "tab") {
        appState.activeTab = button.dataset.tab;
        render();
      }
      if (action === "scene-choice") {
        chooseOption(Number(button.dataset.index));
      }
    });
  });

  appRoot.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      appState.draft = {
        ...appState.draft,
        [input.dataset.field]: input.value,
      };
    });
    input.addEventListener("change", () => {
      appState.draft = {
        ...appState.draft,
        [input.dataset.field]: input.value,
      };
      render();
    });
  });
}

function renderHome() {
  const autosave = getSavePreview(appState.saves[AUTOSAVE_SLOT]);
  return `
    <div class="shell">
      <section class="hero">
        <div class="hero-top">
          <div>
            <span class="ink-badge">Traditional Chinese Narrative Cultivation RPG MVP</span>
            <h1 class="hero-title">凡塵問道</h1>
            <p class="hero-subtitle">
              以規則引擎驅動結果、以敘事模板包裝回響的修仙網頁遊戲原型。
              你將從凡人起步，在宗門、奇遇、心魔與因果之間，走出一條可重玩的命途。
            </p>
            <div class="home-actions">
              <button id="start-btn" class="primary-btn" data-action="quick-start">快速入道</button>
              <button class="secondary-btn" data-action="open-creator">自訂命盤</button>
              <button class="secondary-btn" data-action="open-saves" data-from="home">存檔頁</button>
              <button class="ghost-btn" data-action="open-codex" data-from="home">世界觀與圖鑑</button>
            </div>
          </div>
          <aside class="hero-side">
            <h2 class="panel-title">首版內容切片</h2>
            <div class="meta-grid">
              <div class="meta-pill">
                <span class="meta-label">宗門容器</span>
                <strong class="meta-value">青雲宗</strong>
              </div>
              <div class="meta-pill">
                <span class="meta-label">境界梯度</span>
                <strong class="meta-value">練氣至化神</strong>
              </div>
              <div class="meta-pill">
                <span class="meta-label">地點</span>
                <strong class="meta-value">6 個首版地點</strong>
              </div>
              <div class="meta-pill">
                <span class="meta-label">命名 NPC</span>
                <strong class="meta-value">9 位核心角色</strong>
              </div>
            </div>
            <div class="summary-list" style="margin-top: 18px;">
              <div class="summary-item">目前原型已接入角色建立、故事事件池、突破、關係、道途、結局與本地存檔。</div>
              <div class="summary-item">後續可在不重寫規則的前提下，替換成 AI 場景文案或接後端資料源。</div>
              <div class="summary-item">${autosave ? `最近自動存檔：<span class="summary-strong">${autosave.name}</span>｜${autosave.realm}｜${autosave.location}` : "尚未建立自動存檔，建議先從快速入道開始試玩。"}</div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

function optionCards(options, selectedIndex) {
  return options
    .map(
      (option, index) => `
        <button
          class="choice-btn ${selectedIndex === index ? "is-selected" : ""}"
          data-action="scene-choice"
          data-index="${index}"
        >
          <span class="choice-index">選項 ${index + 1}</span>
          <span class="choice-title">${option.label}</span>
          <span class="choice-copy">${option.copy}</span>
        </button>
      `
    )
    .join("");
}

function renderCreator() {
  const { draft } = appState;
  const previewLine = `${draft.name}將以${draft.origin}之身，帶著${draft.root}與「${draft.destiny}」入局。`;
  const selectedOrigin = characterOptions.origins.find((entry) => entry.id === draft.origin);
  const selectedRoot = characterOptions.roots.find((entry) => entry.id === draft.root);
  const selectedPersonality = characterOptions.personalities.find((entry) => entry.id === draft.personality);
  const selectedDestiny = characterOptions.destinies.find((entry) => entry.id === draft.destiny);
  return `
    <div class="shell">
      <section class="panel">
        <div class="header-row">
          <div>
            <span class="ink-badge">角色建立</span>
            <h1 class="scene-title">自訂你的命盤</h1>
            <p class="body-copy">角色建立會直接影響初始資源、事件權重、敘事口吻與關係走向。</p>
          </div>
          <div class="header-actions">
            <button class="ghost-btn" data-action="go-home">返回首頁</button>
          </div>
        </div>
        <div class="creator-grid">
          <div class="form-card">
            <div class="field-grid">
              <label>
                <span class="field-label">角色姓名</span>
                <input class="field-input" data-field="name" value="${draft.name}" maxlength="12" />
              </label>
              <label>
                <span class="field-label">出身</span>
                <select class="field-select" data-field="origin">
                  ${characterOptions.origins
                    .map((entry) => `<option value="${entry.id}" ${entry.id === draft.origin ? "selected" : ""}>${entry.id}</option>`)
                    .join("")}
                </select>
              </label>
              <label>
                <span class="field-label">靈根</span>
                <select class="field-select" data-field="root">
                  ${characterOptions.roots
                    .map((entry) => `<option value="${entry.id}" ${entry.id === draft.root ? "selected" : ""}>${entry.id}</option>`)
                    .join("")}
                </select>
              </label>
              <label>
                <span class="field-label">性格傾向</span>
                <select class="field-select" data-field="personality">
                  ${characterOptions.personalities
                    .map((entry) => `<option value="${entry.id}" ${entry.id === draft.personality ? "selected" : ""}>${entry.id}</option>`)
                    .join("")}
                </select>
              </label>
              <label>
                <span class="field-label">命格</span>
                <select class="field-select" data-field="destiny">
                  ${characterOptions.destinies
                    .map((entry) => `<option value="${entry.id}" ${entry.id === draft.destiny ? "selected" : ""}>${entry.id}</option>`)
                    .join("")}
                </select>
              </label>
            </div>
            <div class="home-actions" style="margin-top: 24px;">
              <button class="secondary-btn" data-action="randomize-draft">隨機命盤</button>
              <button class="primary-btn" data-action="start-custom">踏入修行界</button>
            </div>
          </div>
          <aside class="form-card">
            <h2 class="panel-title">命盤預覽</h2>
            <p class="summary-copy">${previewLine}</p>
            <div class="summary-list">
              <div class="summary-item"><span class="summary-strong">出身：</span>${selectedOrigin.summary}</div>
              <div class="summary-item"><span class="summary-strong">靈根：</span>${selectedRoot.summary}</div>
              <div class="summary-item"><span class="summary-strong">性格：</span>${selectedPersonality.summary}</div>
              <div class="summary-item"><span class="summary-strong">命格：</span>${selectedDestiny.summary}</div>
            </div>
            <div class="empty-state" style="margin-top: 18px;">
              這一版先用規則驅動與手工敘事模板跑通流程。未來若接入 AI，只需要把事件結果餵給文案層即可。
            </div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

function renderGame() {
  const view = getGameViewModel(appState.game);
  const resourceSummary = view.resources.map((resource) => `${resource.label} ${resource.value}`).join("｜");
  const activeTabContent =
    appState.activeTab === "status"
      ? view.stats
          .map(
            (item) => `
              <div class="stat-card">
                <span class="stat-label">${item.label}</span>
                <strong class="stat-value">${item.value}</strong>
              </div>
            `
          )
          .join("")
      : (appState.activeTab === "inventory" ? view.inventory : appState.activeTab === "relationships" ? view.relationships : view.biography)
          .map(
            (item) => `
              <div class="list-card">
                <div class="list-title">${item.title}</div>
                <div class="list-copy">${item.copy}</div>
              </div>
            `
          )
          .join("") || `<div class="empty-state">目前這個分頁還沒有可顯示的內容。</div>`;

  return `
    <div class="shell">
      <section class="header-row card">
        <div>
          <div class="header-title">
            <span class="header-name">${view.header.name}</span>
            <span class="ink-badge">${view.header.realm}</span>
          </div>
          <div class="header-meta">
            ${view.header.chapter}｜${view.header.location}｜${view.header.sectRank}｜${view.header.daoPath}<br />
            ${view.header.summary}
          </div>
        </div>
        <div class="header-actions">
          <button class="secondary-btn" data-action="open-saves" data-from="game">存檔</button>
          <button class="ghost-btn" data-action="open-codex" data-from="game">圖鑑</button>
          <button class="ghost-btn" data-action="go-home">首頁</button>
        </div>
      </section>
      <div class="game-grid">
        <section class="panel">
          <div>
            <span class="ink-badge">${appState.scene.kind === "hub" ? "行動抉擇" : "事件場景"}</span>
            <h1 class="scene-title">${appState.aiScene?.aiTitle || appState.scene.title}</h1>
          </div>
          <div class="scene-body">${appState.aiScene?.aiBody || appState.scene.body}</div>
          <div class="footer-help">${resourceSummary}</div>
          <div class="choice-list">
            ${appState.aiScene?.aiOptions
              ? appState.aiScene.aiOptions.map((opt, idx) => `
                <button class="choice-btn ${appState.selectedOptionIndex === idx ? "is-selected" : ""}" data-action="scene-choice" data-index="${idx}">
                  <span class="choice-index">選項 ${idx + 1}</span>
                  <span class="choice-title">${opt.label}</span>
                  <span class="choice-copy">${opt.copy}</span>
                </button>
              `).join("")
              : optionCards(appState.scene.options, appState.selectedOptionIndex)
            }
          </div>
          <div class="footer-row">
            <div class="footer-help">可用方向鍵切換選項，按空白鍵、Enter 或數字 1-5 決定。Playwright 驗證也走同一套控制。</div>
            <div class="tag-row">
              <span class="tag">最近回響：${appState.game.recentOutcome}</span>
            </div>
          </div>
        </section>
        <aside class="sidebar-stack">
          <section class="sidebar-card">
            <h2 class="panel-title">命盤側欄</h2>
            <div class="tab-strip">
              <button class="tab-btn ${appState.activeTab === "status" ? "is-active" : ""}" data-action="tab" data-tab="status">狀態</button>
              <button class="tab-btn ${appState.activeTab === "inventory" ? "is-active" : ""}" data-action="tab" data-tab="inventory">背包</button>
              <button class="tab-btn ${appState.activeTab === "relationships" ? "is-active" : ""}" data-action="tab" data-tab="relationships">關係</button>
              <button class="tab-btn ${appState.activeTab === "biography" ? "is-active" : ""}" data-action="tab" data-tab="biography">傳記</button>
            </div>
            ${
              appState.activeTab === "status"
                ? `<div class="stat-grid">${activeTabContent}</div>`
                : `<div class="list-row">${activeTabContent}</div>`
            }
          </section>
          <section class="sidebar-card">
            <h2 class="panel-title">最近記憶</h2>
            <div class="list-row">
              ${
                view.memories.length
                  ? view.memories
                      .map(
                        (memory) => `
                          <div class="list-card">
                            <div class="list-copy">${memory}</div>
                          </div>
                        `
                      )
                      .join("")
                  : `<div class="empty-state">還沒有留下足夠清晰的世界回響。</div>`
              }
            </div>
          </section>
        </aside>
      </div>
    </div>
  `;
}

function renderSaves() {
  return `
    <div class="shell">
      <section class="panel">
        <div class="header-row">
          <div>
            <span class="ink-badge">本地存檔</span>
            <h1 class="scene-title">存檔與讀檔</h1>
            <p class="body-copy">提供 1 個自動存檔與 3 個手動欄位。存檔內容包含角色、資源、關係、傳記與世界進度。</p>
          </div>
          <div class="header-actions">
            <button class="ghost-btn" data-action="return-overlay">返回</button>
          </div>
        </div>
        <div class="save-grid">
          ${[AUTOSAVE_SLOT, ...MANUAL_SAVE_SLOTS]
            .map((slotId) => {
              const slot = appState.saves[slotId];
              const preview = getSavePreview(slot);
              return `
                <article class="slot-card">
                  <div class="slot-title">${slotId === AUTOSAVE_SLOT ? "自動存檔" : `手動欄位 ${slotId.slice(-1)}`}</div>
                  <div class="slot-meta">
                    ${
                      preview
                        ? `${preview.name}｜${preview.realm}｜${preview.location}<br />${preview.chapter}｜${preview.daoPath}｜聲望 ${preview.reputation}`
                        : "目前沒有資料。"
                    }
                  </div>
                  <div class="slot-actions">
                    ${appState.game && slotId !== AUTOSAVE_SLOT ? `<button class="slot-btn" data-action="save-slot" data-slot="${slotId}">覆寫存檔</button>` : ""}
                    ${slot ? `<button class="secondary-btn" data-action="load-slot" data-slot="${slotId}">讀取</button>` : ""}
                    ${slot && slotId !== AUTOSAVE_SLOT ? `<button class="ghost-btn" data-action="delete-slot" data-slot="${slotId}">刪除</button>` : ""}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderCodex() {
  return `
    <div class="shell">
      <section class="panel">
        <div class="header-row">
          <div>
            <span class="ink-badge">圖鑑與世界觀</span>
            <h1 class="scene-title">世界資料總覽</h1>
            <p class="body-copy">這裡把設計文件中的核心概念折成前端可見資料，方便後續串資料庫或 AI 文案層。</p>
          </div>
          <div class="header-actions">
            <button class="ghost-btn" data-action="return-overlay">返回</button>
          </div>
        </div>
        <div class="codex-grid">
          ${codeSections
            .map(
              (section) => `
                <article class="codex-card">
                  <h2 class="panel-title">${section.title}</h2>
                  <p class="codex-copy">${section.copy}</p>
                </article>
              `
            )
            .join("")}
        </div>
        <div class="codex-grid">
          ${locationCards
            .map(
              (location) => `
                <article class="codex-card">
                  <h2 class="panel-title">${location.id}</h2>
                  <p class="codex-copy">風險：${location.risk}<br />${location.summary}</p>
                </article>
              `
            )
            .join("")}
        </div>
        <div class="codex-grid">
          ${daoPathCards
            .map(
              (path) => `
                <article class="codex-card">
                  <h2 class="panel-title">${path.id}</h2>
                  <p class="codex-copy">${path.summary}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderEnding() {
  return `
    <div class="shell ending-shell">
      <section class="ending-card">
        <span class="ink-badge">${appState.ending.tone === "warn" ? "命途止於此處" : "此道已成其名"}</span>
        <h1 class="ending-title">${appState.ending.title}</h1>
        <p class="ending-copy">${appState.ending.copy}</p>
        <div class="tag-row">
          ${appState.ending.highlights
            .map((entry) => `<span class="tag ${appState.ending.tone === "warn" ? "warn-tag" : ""}">${entry}</span>`)
            .join("")}
        </div>
        <div class="list-row">
          ${appState.ending.biography
            .map(
              (entry) => `
                <div class="list-card">
                  <div class="list-copy">${entry}</div>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="home-actions">
          <button class="primary-btn" data-action="new-cycle">再開新局</button>
          <button class="ghost-btn" data-action="go-home">返回首頁</button>
        </div>
      </section>
    </div>
  `;
}

function render() {
  if (appState.mode === "home") {
    appRoot.innerHTML = renderHome();
  }
  if (appState.mode === "creator") {
    appRoot.innerHTML = renderCreator();
  }
  if (appState.mode === "game" && appState.game && appState.scene) {
    appRoot.innerHTML = renderGame();
  }
  if (appState.mode === "saves") {
    appRoot.innerHTML = renderSaves();
  }
  if (appState.mode === "codex") {
    appRoot.innerHTML = renderCodex();
  }
  if (appState.mode === "ending" && appState.ending) {
    appRoot.innerHTML = renderEnding();
  }
  attachEvents();
}

window.render_game_to_text = () => {
  if (!appState.game) {
    return JSON.stringify({
      mode: appState.mode,
      screen: "home",
      options: ["快速入道", "自訂命盤", "存檔頁", "世界觀與圖鑑"],
    });
  }
  return getRenderState(
    appState.game,
    appState.scene,
    appState.mode,
    appState.selectedOptionIndex,
    appState.activeTab
  );
};

window.advanceTime = async () => {
  render();
};

window.addEventListener("keydown", (event) => {
  if (appState.mode !== "game" || !appState.scene) return;
  const total = appState.scene.options.length;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    appState.selectedOptionIndex = (appState.selectedOptionIndex + 1) % total;
    render();
    event.preventDefault();
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    appState.selectedOptionIndex = (appState.selectedOptionIndex - 1 + total) % total;
    render();
    event.preventDefault();
  }
  if (event.key === "Enter" || event.key === " ") {
    chooseOption(appState.selectedOptionIndex);
    event.preventDefault();
  }
  if (/^[1-5]$/.test(event.key)) {
    const picked = Number(event.key) - 1;
    if (picked < total) {
      chooseOption(picked);
      event.preventDefault();
    }
  }
});

render();
