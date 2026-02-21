# ChatJapan Theme Design (Dark/Light)

Date: 2026-02-21
Status: Approved

## 1. Goal
- ダーク/ライトのテーマ切替を追加する。
- 初回アクセス時（保存済み設定なし）は常にダークを適用する。
- ヘッダー右側にトグルを配置し、選択状態を永続化する。
- 地図本体タイルは今回固定とし、将来地図テーマを追加しやすい設計にする。

## 2. Scope
### In Scope
- `next-themes` によるテーマ管理導入
- `ThemeProvider` の追加と `layout.tsx` への適用
- ヘッダーへのテーマトグル追加
- 主要コンポーネントの直書き色をテーマトークンへ置換

### Out of Scope
- 地図タイル（OpenStreetMap）の見た目切替
- 地図テーマのUI実装
- 大規模なデザイン刷新

## 3. Architecture
- テーマ管理は `next-themes` を採用する。
- `ThemeProvider` は `attribute="class"` を使って `dark` クラス制御を行う。
- 初期設定は `defaultTheme: "dark"`, `enableSystem: false` とする。
- 永続化は `next-themes` の `storageKey` を利用する。
- 将来の地図テーマは UIテーマと分離した別状態（例: `mapTheme`）として拡張可能な責務分離にする。

## 4. Component Design
- 新規: `src/components/providers/ThemeProvider.tsx`
  - `next-themes` の薄いラッパーを提供
- 変更: `src/app/layout.tsx`
  - `AuthProvider` と同階層で `ThemeProvider` を適用
- 変更: `src/components/layout/Header.tsx`
  - 右側アクション群にテーマトグルを追加
- 変更: `src/components/layout/SplitLayout.tsx`
- 変更: `src/components/chat/ChatPanel.tsx`
- 変更: `src/components/chat/MessageList.tsx`
- 変更: `src/components/map/MapPanel.tsx`
  - オーバーレイやコンテキストメニューの色をテーマトークンへ置換

## 5. Data Flow / State
- テーマ状態のソースは `next-themes` の `resolvedTheme`。
- トグル操作は `setTheme("dark" | "light")` のみを実行。
- 保存は `next-themes` 側に委譲。
- 保存値がない初回アクセスはダーク適用。

## 6. Error Handling / Robustness
- SSR/CSR 差分による不整合を避けるため、必要に応じてトグル描画をマウント後に行う。
- テーマ未確定時も破綻しないよう、ダーク前提で安全側の表示を維持する。
- 機能挙動（地図操作/チャット送信/認証）は変更しない。

## 7. Verification Strategy
- 既存テストを実行して回帰確認。
- 可能であればヘッダーのトグル切替テストを追加。
- 追加困難な場合は手動確認手順を明記:
  1. 初回表示がダークである
  2. トグルでライト/ダークが切り替わる
  3. リロード後も選択テーマが維持される
  4. 地図タイル表示に影響がない

## 8. Future Extension
- 設定UIに `mapTheme` を追加し、UIテーマとは別に地図スタイルURL/レイヤー設定を切替可能にする。
- 今回の実装では拡張ポイント（状態分離）だけ確保する。
