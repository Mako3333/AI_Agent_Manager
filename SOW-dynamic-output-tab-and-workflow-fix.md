# SOW: 右パネルの出力タブの動的化とワークフロー不具合修正

## 概要
- 対象: `app/`（App Router）、`components/`（右側出力タブ群）、`hooks/use-workflow.ts`、`lib/workflow-engine.ts`、`app/api/workflow/*`
- 目的:
  - 右側の「出力タブ」（Pain/Solution/Agents/Manifest/CloudRun）で、ハードコーディングされた表示を排し、ユーザー入力とワークフロー結果に完全同期させる。
  - 新規入力（解析実行）時に右パネル状態をリセットし、動的に到着する結果を逐次反映する。
  - 既知のワークフロー実行時の不具合（型不一致、初期表示の残留、エラーハンドリング不足など）を解消する。

## 現状と課題（コード調査により確認済み）
### ハードコーディング箇所
- `components/pain-analysis-panel.tsx` (50-106行): 候補者可視化不足、要件粒度の不整合など3件のデモPainデータ
- `components/solution-design-panel.tsx` (111-219行): 候補者情報統合・可視化システムのデモソリューション
- `components/agent-manifest-editor.tsx` (82-139行): resume-parserのデモマニフェスト
- `components/cloud-run-deployment.tsx` (95-113行): ai-agent-platformのデモ設定
- `components/output-panels.tsx` (109-127行): Agent候補のチェックボックスリスト（4件）
- `components/chat-interface.tsx` (278-311行、328-362行): Pain/Agentsチップのフォールバック表示

### リセット機能の欠如
- `hooks/use-workflow.ts` に `reset()` メソッドが存在しない
- `startWorkflow()` 実行時に前回のcontextデータが残留する可能性
- 新規実行時のactiveTab初期化が未実装

### 型定義の不整合
- APIスキーマ（Zod）: `painAnalysis` に `background`、`rootCause` フィールドが存在
- APIスキーマ（Zod）: `solutionDesign` に `background`、`architecture`、`feasibility` フィールドが存在
- `WorkflowContext` 型定義: 上記フィールドが欠落している
- この不一致により、APIレスポンスの一部データがUIに反映されない

### エラーハンドリング
- 基本的なエラーハンドリングは実装済み（`stages[*].status = "error"`）
- UIでのエラー表示が限定的（タブのステータス表示のみ）

## スコープ（やること）
1) 出力タブのハードコーディング撤廃/完全動的化
- `components/pain-analysis-panel.tsx`/`solution-design-panel.tsx`/`cloud-run-deployment.tsx`/`agent-manifest-editor.tsx` からデモ用フォールバック項目を削除し、`useWorkflow().context` に存在する場合のみ描画。
- 空状態はプレースホルダーメッセージ（例: 「まだ結果はありません」）に統一。

2) 入力開始時の「右パネル状態のリセット」
- `use-workflow.ts` に `reset()` を追加（`context` から `painAnalysis/solutionDesign/agentGeneration/manifest` を `undefined` に戻し、`stages` を pending に初期化、`activeTab` リセットのためイベント発火）。
- `startWorkflow(userInput)` の先頭で `reset()` を呼ぶ。`notify()` で即座に UI に反映。
- `components/output-panels.tsx` のタブ選択は新規実行時に "pain" に戻す。（`activeTab` を props で受ける or 内部 state を `useEffect` で同期）。

3) ワークフロー整合性/型の調整とエラーハンドリング
- `WorkflowContext` と API レスポンス（Zod スキーマ）の完全一致を実現：
  - `painAnalysis.pains` に `background`、`rootCause` フィールドを追加
  - `solutionDesign.solutions` に `background`、`architecture`、`feasibility` フィールドを追加
  - 全フィールドを適切にoptional設定し、UI側でnull-safeに参照
- `execute*` 失敗時に `stages[i].status = "error"`/`error` を設定済みだが、UI に「エラー」タブ/バッジを出す。
- API 500/400 のときの UI トースト/メッセージ（右パネルに簡易アラート）を追加。

4) 表示/ローディングの一貫性
- 各タブの上部にステージの `running/completed/error` バッジを統一表示。
- `isRunning` 中はフォールバック描画なし。ストリーミング/到着順に差分描画。

5) マニフェストのサンプル（提供 YAML）の採用
- サンプル YAML を「参考仕様」としてドキュメントに添付し、`AgentManifestEditor` の入力例として参照可にする（実装では yaml->json 変換 UI は別タスク）。

## 非スコープ（やらないこと）
- OpenAI 呼び出しのプロンプト最適化やモデル切替。
- Cloud Run への実デプロイ（`deployment-prep` はローカルでの構成生成まで）。
- 大規模な UI デザイン刷新。

## 実装詳細（変更方針）
### 1. リセット機能の実装
- `hooks/use-workflow.ts`
  - `reset(): void` を追加。`context = { userInput: "" }` に戻し、`stages` を pending へ再初期化。
  - `startWorkflow()` は内部で自動的に `reset()` を呼ぶ設計に変更。
  - `resetCount` または `workflowId` を追加し、新規実行を識別可能にする。

- `lib/workflow-engine.ts`
  - `reset()` メソッドを追加。`context` を初期状態に戻し、`stages` を全て pending に。
  - `startWorkflow()` で最初に `reset()` を呼び、クリーンな状態から開始を保証。
  - `notify()` でリセット情報も含めて通知。

### 2. 型定義の修正
- `lib/workflow-engine.ts` の `WorkflowContext` インターフェース更新：
  ```typescript
  painAnalysis?: {
    pains: Array<{
      // 既存フィールド...
      background?: string      // 追加
      rootCause?: string      // 追加
    }>
    // 既存の structuralAnalysis...
  }
  solutionDesign?: {
    solutions: Array<{
      // 既存フィールド...
      background?: string      // 追加
      architecture?: string    // 追加
      feasibility?: string     // 追加
    }>
    // 既存の structuralAnalysis...
  }
  ```

### 3. UI コンポーネントの更新
- `components/output-panels.tsx`
  - Agent候補のハードコードされたチェックボックス（109-127行）を削除。
  - `useEffect` で `resetCount` または全stages pendingを監視し、activeTabを"pain"に戻す。
  - 各タブでデータ未取得時は統一されたエンプティメッセージを表示。

- `components/chat-interface.tsx`
  - Pain/Agentsチップのフォールバック（278-311行、328-362行）を削除。
  - `context` にデータがない場合は「データ未取得」や「実行してください」を表示。
  - `handleAIExecution` では `startWorkflow` を呼ぶだけ（resetは内部で自動実行）。

- `components/pain-analysis-panel.tsx`
  - フォールバックデータ（50-106行）を完全削除。
  - `painAnalysis` がundefinedまたは空の場合のエンプティ状態UI実装。
  - 新規フィールド（background、rootCause）の表示追加。

- `components/solution-design-panel.tsx`
  - フォールバックデータ（111-219行）を完全削除。
  - `solutionDesign` がundefinedまたは空の場合のエンプティ状態UI実装。
  - 新規フィールド（background、architecture、feasibility）の表示追加。

- `components/agent-manifest-editor.tsx`
  - フォールバックマニフェスト（82-139行）を削除。
  - `manifest` がundefinedの場合のエンプティ状態実装。

- `components/cloud-run-deployment.tsx`
  - フォールバック設定（95-113行）を削除。
  - `deploymentConfig` がundefinedの場合のエンプティ状態実装。

### 4. エラーハンドリング強化
- 各パネルで `stages` のエラー状態を確認し、エラーメッセージを表示。
- `output-panels.tsx` のタブにエラー時は赤いバッジ/アイコンを表示。

## 受け入れ基準（Acceptance Criteria）
- 入力欄に課題を入力→「AI実行」を押下すると、右パネルの各タブは即時にリセット（ダミー表示無し）。
- ステージ進行に応じて、Pain→Solution→Agents→Manifest→CloudRun の順にタブに結果が到着し、到着したタブだけが内容を持つ。
- 実行途中での `activeTab` は常に保持されるが、新規実行開始時は "pain" に戻る。
- エラー発生時は該当タブにエラーバッジと簡易メッセージが表示される。
- フォールバックのハードコードは全廃。`grep` で該当プレースホルダ文字列が出ない。

## テスト計画（最小）
- 手動: 3パターン
  1. 正常系: 入力→逐次結果到着→各タブに反映。フォールバックが出ないこと。
  2. 途中エラー: 任意の API を 500 にしてエラー表示が出ること。
  3. 連続実行: 実行完了前に再度 `AI実行` → 直前結果がリセットされること。
- 単体（任意）: `lib/workflow-engine.ts` の `startWorkflow/reset/notify` の状態遷移を Vitest でスモーク確認。

## スケジュール目安
- 実装: 0.5〜1.0 日
- 動作確認/微修正: 0.5 日

## 成果物
- 改修済みコード（右パネル完全動的化、リセット導線、エラーハンドリング強化）
- ランブック（README 追記: 動的更新/エラー表示の挙動）
- 実装済み機能一覧：
  - ✅ ワークフロー実行時の自動リセット機能
  - ✅ 全ハードコーディング除去（6ファイル、計200行以上）
  - ✅ APIスキーマとWorkflowContext型の完全一致
  - ✅ エンプティ状態の統一UI
  - ✅ エラー時のビジュアルフィードバック

## リスクと対応
- 外部 API（OpenAI）未設定時: UI は「未接続」表示でフォールバックしない方針。`.env.local` ガイドを README に明記。
- 型不一致: Zod/TypeScript の差異は UI で optional 前提の null-safe 実装に調整。

---

## 参考: Manifest サンプル（提供 YAML）

```yaml
apiVersion: v1
kind: Agent
metadata:
  name: "team-standup-facilitator"
  version: "1.0.0"
  owner: "dev-team-ops"
spec:
  role: "チームのデイリースタンドアップを効率化し、進捗・課題・次のアクションを整理して共有する"
  inputs:
    - name: checkins
      schema: "#/schemas/CheckInNotes"   # メンバーからの進捗・課題入力
    - name: backlog
      schema: "#/schemas/BacklogItems"   # タスク/Issueリスト
  outputs:
    - name: summary
      schema: "#/schemas/MeetingSummary" # 議事録要約（進捗/課題/アクション）
    - name: action_items
      schema: "#/schemas/ActionItems"    # 次のステップ
    - name: broadcast
      schema: "#/schemas/Notification"   # Slack/Teams通知
  tasks:
    - "各メンバーの進捗・課題・所要時間を抽出"
    - "タスクボードと突合し、進捗/ブロッカーを整理"
    - "要約とアクションアイテムを生成し、Slackに投稿"
  tools:
    - name: "slack"
      type: "http"
      params:
        endpoint: "https://slack.com/api/chat.postMessage"
        channel: "#daily-standup"
    - name: "supabase"
      type: "database"
      params:
        table: "team_checkins"
    - name: "llm"
      type: "openai"
      params:
        model: "gpt-4o-mini"
        temperature: 0.3
  policies:
    sla:
      timeout_sec: 120
      retries: 1
    pii:
      mask: ["email"]
    fairness:
      deny_features: ["personal_opinion_bias"]
  runtime:
    type: "cloud-run"
    image: "asia-northeast1-docker.pkg.dev/project/agents/standup-facilitator:1.0.0"
    env:
      - "SUPABASE_URL"
      - "SUPABASE_SERVICE_ROLE_KEY"
      - "SLACK_BOT_TOKEN"
      - "OPENAI_API_KEY"
  observability:
    tracing: true
    log_level: "info"
```

