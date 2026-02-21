# Mobile Mode Toggle Design

## Problem

On mobile, right-click is unavailable, so users cannot access the mode switching context menu
(prefecture / municipality selection mode).

## Solution

Add a `MobileModeToggle` component — a segmented control with 「県」 and 「市区町村」 buttons —
displayed as a floating overlay in the top-right corner of the map. Mobile-only (`md:hidden`).

## Component: MobileModeToggle

**File:** `src/components/map/MobileModeToggle.tsx`

**Props:**
```typescript
interface MobileModeToggleProps {
  selectionMode: SelectionMode
  selectedArea: SelectedArea | null
  focusedPrefecture: SelectedArea | null
  onEnterMunicipalityMode: (prefecture: SelectedArea) => void
  onExitMunicipalityMode: () => void
}
```

**Button states:**

| Button | Active when | Enabled when | On click |
|--------|-------------|--------------|----------|
| 県 | `selectionMode === 'prefecture'` | Always | `onExitMunicipalityMode()` |
| 市区町村 | `selectionMode === 'municipality'` | `selectionMode === 'prefecture' && selectedArea?.level === 'prefecture'` OR `selectionMode === 'municipality'` | `onEnterMunicipalityMode(selectedArea)` |

**Placement in MapPanel:**
```tsx
<div className="absolute top-3 right-3 z-10 md:hidden">
  <MobileModeToggle ... />
</div>
```

## Visual Layout

```
┌──────────────────────────────────┐
│  岐阜県の市区町村    [県][市区町村] │  ← top-right toggle
│                                  │
│            (map)                 │
│                                  │
│  タップ: 市区町村を選択…          │
└──────────────────────────────────┘
```

Active button: `bg-primary text-primary-foreground`
Inactive button: `bg-card/90 text-muted-foreground`
Disabled button: `opacity-50 cursor-not-allowed`

## Testing

TDD approach:
1. Renders both buttons
2. Active style applied correctly per mode
3. Municipality button disabled when no prefecture selected
4. Municipality button enabled when prefecture selected
5. Clicking municipality button calls `onEnterMunicipalityMode` with selectedArea
6. Clicking prefecture button calls `onExitMunicipalityMode`
7. MapPanel renders MobileModeToggle (integration)
