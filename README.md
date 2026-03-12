# Classroom Number Guessing App

課堂猜數字實驗應用。

## 部署到 Vercel（必須設定 KV）

### 步驟一：建立 Vercel KV 資料庫

1. 登入 [vercel.com](https://vercel.com) → 進入你的專案
2. 點選上方 **Storage** 分頁
3. 點 **Create Database** → 選 **KV**
4. 命名（例如 `classroom-kv`）→ 建立
5. 建立後點 **.env.local** 分頁，複製以下三個環境變數：
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 步驟二：加入環境變數

在 Vercel 專案 → **Settings** → **Environment Variables**，
把上面三個變數貼入，套用到 Production / Preview / Development。

### 步驟三：重新部署

推送任意 commit 觸發重新部署，或在 Vercel 點 **Redeploy**。

---

## 流程說明

| 狀態 | 學生頁面 | 主持人操作 |
|------|----------|-----------|
| idle（待機） | 無法提交，顯示「等待開始」 | 按「開始收集」 |
| collecting（收集中） | 可輸入並提交猜測 | 按「停止收集 / 揭曉」 |
| revealed（已揭曉） | 顯示「本輪已結束」 | 看結果，按「下一輪」 |

## 頁面

- `/` — 學生頁面
- `/host` — 主持人（密碼：5148）
