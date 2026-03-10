# Classroom Number Guessing App

課堂猜數字實驗應用，用於期望值與信念誘導實驗。

## 頁面說明

- `/` — 學生頁面：輸入學號與猜測數字
- `/host` — 主持人頁面：控制輪次、揭曉結果、查看統計

## 功能

- 每輪學生只能提交一次
- 主持人可揭曉結果、開始下一輪、重置所有資料
- 結果揭曉後顯示：
  - 各輪統計（平均、中位數、標準差）
  - 分佈直方圖
  - 猜測總表（學號 × 輪次）
  - 調整幅度表

## 本地執行

```bash
npm install
npm run dev
```

## 部署到 Vercel

1. 將此資料夾推送到 GitHub repo
2. 在 [vercel.com](https://vercel.com) 匯入 repo
3. 一鍵部署，無需額外設定

> **注意**：使用 `/tmp` 暫存 JSON，Vercel Serverless 重啟後資料會清除。
> 適合課堂單次使用。如需持久化，可改接 Vercel KV 或 Upstash。

## 技術架構

- Next.js 14 (Pages Router)
- Recharts（直方圖）
- 無資料庫，暫存於 `/tmp/classroom-data.json`
