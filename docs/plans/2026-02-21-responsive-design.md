# Responsive Design for ChatJapan

## Goal

モバイル（md未満 / 768px）でタブ切り替えUIを追加し、スマートフォンでも快適に使えるようにする。PC（md以上）は現状のスプリットスクリーンレイアウトを維持する。

## Architecture

### レイアウト構造

**PC（md以上）**
```
[Header                    ]
[  地図パネル  |  チャット  ]
```

**モバイル（md未満）**
```
[Header        ]
[              ]
[  地図 or     ]
[  チャット    ]  ← activeTab で切り替え
[              ]
[🗾  💬        ]  ← MobileTabBar（ボトムナビ）
```

### ブレークポイント

Tailwind の `md`（768px）を境界とする。

### 表示切り替え方法

- `SplitLayout` → `hidden md:flex`（PC のみ表示）
- `MobileLayout` → `flex md:hidden`（モバイルのみ表示）
- CSS で切り替えるため、JS の `useMediaQuery` は不要

## Components

### 新規作成

**`src/components/layout/MobileTabBar.tsx`**
- アイコンのみのタブ（2つ: 地図・チャット）
- 地図: `Map` アイコン、チャット: `MessageCircle` アイコン（lucide-react）
- アクティブ: `foreground` 色、非アクティブ: `muted-foreground` 色
- 高さ: `h-14`（56px）
- iOS ホームバー対応: `pb-[env(safe-area-inset-bottom)]`

**`src/components/layout/MobileLayout.tsx`**
- props: `left`, `right`, `activeTab: 'map' | 'chat'`, `onTabChange`
- `activeTab === 'map'` → left 表示、right を `invisible`（DOM 維持）
- `activeTab === 'chat'` → right 表示、left を `invisible`（DOM 維持）
- MapPanel を `invisible` で隠す理由: `display:none` にするとWebGLコンテキストが解放され、再表示時に地図の再初期化コストが発生するため

### 既存変更

**`src/app/page.tsx`**
- `activeTab: 'map' | 'chat'` の state 追加（デフォルト: `'map'`）
- `handleAreaSelect`: エリア選択時に `setActiveTab('chat')` で自動遷移（モバイルのUX改善）
- `SplitLayout` と `MobileLayout` を並列配置、CSS で切り替え

**`src/app/layout.tsx`**
- `<meta name="viewport">` に `viewport-fit=cover` を追加（safe-area 対応）

## Data Flow

```
page.tsx (activeTab state)
  ├── SplitLayout [hidden md:flex] ← PC
  └── MobileLayout [flex md:hidden] ← モバイル
        ├── left=<MapPanel> (inactive時: invisible)
        ├── right=<ChatPanel> (inactive時: invisible)
        └── <MobileTabBar activeTab onTabChange />
```

エリア選択時のフロー（モバイル）:
1. ユーザーが地図でエリアをタップ
2. `handleAreaSelect` → `selectArea(area)` + `setActiveTab('chat')`
3. チャットタブに自動遷移、エリアコンテキストが ChatPanel に渡される

## Testing

**MobileTabBar.test.tsx**
- タブクリックで `onTabChange` が正しい引数で呼ばれること
- アクティブタブに適切なスタイルが当たること

**MobileLayout.test.tsx**
- `activeTab='map'` のとき left が表示（`invisible` クラスなし）、right が非表示（`invisible` クラスあり）
- `activeTab='chat'` のとき right が表示、left が非表示

既存テスト（SplitLayout・MapPanel・ChatPanel）への変更なし。

## Edge Cases

| ケース | 対応 |
|--------|------|
| MapPanel の WebGL コンテキスト | `invisible`（`visibility: hidden`）で DOM 維持 |
| PC → モバイルへリサイズ | CSS 切り替えのみ、`activeTab` 状態は保持 |
| iOS ホームバーとタブバーの重なり | `env(safe-area-inset-bottom)` padding で吸収 |
| エリア選択 → チャット自動遷移 | `handleAreaSelect` 内で `setActiveTab('chat')` |
