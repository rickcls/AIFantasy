# 凡塵問道

《凡塵問道》是一個以繁體中文撰寫的修仙互動敘事網頁遊戲原型。這一版先用前端規則引擎與手工敘事模板把核心循環跑通，方便之後再接 AI 文案層、後端資料層或部署流程。

## 目前已有

- 首頁、角色建立、主遊戲頁、存檔頁、結局頁、世界觀圖鑑
- 角色建立：出身、靈根、性格、命格
- 核心數值：境界、修為、壽元、氣血、靈力、神識、道心、福緣、因果、聲望、魔念
- 宗門、探索、關係、突破、天劫、終局等 storylet 事件
- 道途傾向：正道、霸道、魔道、無情道、逍遙道
- 本地存檔：1 個自動存檔、3 個手動存檔
- 鍵盤操作：方向鍵切換選項，`Space` / `Enter` 確認，數字 `1-5` 快速選擇
- `window.render_game_to_text()` 與 `window.advanceTime()` 測試介面

## 專案結構

- [index.html](/Users/rickmok/Documents/AI/index.html)：應用入口
- [styles.css](/Users/rickmok/Documents/AI/styles.css)：整體視覺與響應式版面
- [src/game-data.js](/Users/rickmok/Documents/AI/src/game-data.js)：角色選項、地點、道途、NPC 與世界資料
- [src/game-engine.js](/Users/rickmok/Documents/AI/src/game-engine.js)：規則引擎、事件池、存檔與狀態轉換
- [src/main.js](/Users/rickmok/Documents/AI/src/main.js)：UI 渲染與互動控制

## 本地執行

```bash
npm start
```

之後打開 [http://127.0.0.1:4173](http://127.0.0.1:4173)。

## 驗證

這次開發有實際跑過：

- Playwright 瀏覽器互動檢查
- 快速入道 -> 主場景 -> 事件 -> 結果回到主循環
- 鍵盤切換選項
- 行旅換地後，地點與狀態文字同步更新
- 手機尺寸視窗的響應式畫面檢查

## 適合下一步做的事

- 把事件資料抽成 JSON 或資料表，方便擴寫內容量
- 把敘事模板替換成 AI 生成層，但保留規則引擎主導結果
- 補更多 NPC 關係回收、結局分支與特殊物品效果
- 加上正式部署流程，例如 Vercel 或 GitHub Pages
