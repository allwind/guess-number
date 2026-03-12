# Classroom Number Guessing App

課堂猜數字實驗應用。

---

## 部署步驟

### 步驟一：建立免費 Upstash Redis 資料庫

1. 前往 [console.upstash.com](https://console.upstash.com) 註冊／登入（免費）
2. 點 **Create Database**
3. 名稱隨意（例如 `classroom`），地區選 **Global** 或 **ap-northeast-1（東京）**
4. 建立後，在資料庫頁面找到 **REST API** 區塊
5. 複製以下兩個值：
   - `UPSTASH_REDIS_REST_URL`（以 `https://` 開頭）
   - `UPSTASH_REDIS_REST_TOKEN`

### 步驟二：在 Vercel 加入環境變數

1. Vercel 專案 → **Settings** → **Environment Variables**
2. 新增兩筆（套用到 Production / Preview / Development）：

| 名稱 | 值 |
|------|-----|
| `UPSTASH_REDIS_REST_URL` | 從 Upstash 複製的 URL |
| `UPSTASH_REDIS_REST_TOKEN` | 從 Upstash 複製的 Token |

### 步驟三：重新部署

推送 commit 或在 Vercel 點 **Redeploy**。

---

## 課堂流程

| 狀態 | 學生頁面 | 主持人操作 |
|------|----------|-----------|
| idle（待機） | 顯示「等待開始」，無法提交 | 按「▶ 開始收集」 |
| collecting（收集中） | 可輸入並提交猜測 | 按「⏹ 停止收集 / 揭曉」 |
| revealed（已揭曉） | 顯示「本輪已結束」 | 看結果，按「下一輪」 |

## 頁面

- `/` — 學生頁面
- `/host` — 主持人（密碼：5148）

## 免費方案限制

Upstash 免費方案：每月 500,000 次指令，課堂使用完全足夠。
