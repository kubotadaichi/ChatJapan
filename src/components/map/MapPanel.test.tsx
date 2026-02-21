import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MapPanel } from "./MapPanel"
import type { SelectedArea } from "@/lib/types"

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      once: vi.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === 'load') cb()
      }),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getLayer: vi.fn().mockReturnValue(null),
      getSource: vi.fn().mockReturnValue(null),
      setFeatureState: vi.fn(),
      getFeatureState: vi.fn(),
      getCanvas: vi.fn().mockReturnValue({ style: {} }),
      flyTo: vi.fn(),
    })),
    supported: vi.fn().mockReturnValue(true),
  },
}))

describe("MapPanel", () => {
  it("renders the map container", () => {
    const onSelect = vi.fn()
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={onSelect}
        viewLevel="prefecture"
        focusedPrefecture={null}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.getByTestId("map-container")).toBeInTheDocument()
  })

  it("shows selected area name when area is selected", () => {
    const area: SelectedArea = {
      name: "渋谷区",
      code: "13113",
      prefCode: "13",
      level: "municipality",
    }
    const onSelect = vi.fn()
    render(
      <MapPanel
        selectedArea={area}
        onAreaSelect={onSelect}
        viewLevel="prefecture"
        focusedPrefecture={null}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.getByText("渋谷区を選択中")).toBeInTheDocument()
  })

  it("shows clear button when area is selected", () => {
    const area: SelectedArea = {
      name: "渋谷区",
      code: "13113",
      prefCode: "13",
      level: "municipality",
    }
    const onSelect = vi.fn()
    render(
      <MapPanel
        selectedArea={area}
        onAreaSelect={onSelect}
        viewLevel="prefecture"
        focusedPrefecture={null}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: /選択解除/ })).toBeInTheDocument()
  })

  it('shows back button when viewLevel is municipality', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        viewLevel="municipality"
        focusedPrefecture={{
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        }}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /都道府県に戻る/ })).toBeInTheDocument()
    expect(screen.getByText(/東京都/)).toBeInTheDocument()
  })

  it('does not show back button when viewLevel is prefecture', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        viewLevel="prefecture"
        focusedPrefecture={null}
        onDrillDown={vi.fn()}
        onDrillUp={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /都道府県に戻る/ })).not.toBeInTheDocument()
  })

  it('calls onDrillUp when back button is clicked', async () => {
    const onDrillUp = vi.fn()
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        viewLevel="municipality"
        focusedPrefecture={{
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        }}
        onDrillDown={vi.fn()}
        onDrillUp={onDrillUp}
      />
    )
    const backButton = screen.getByRole('button', { name: /都道府県に戻る/ })
    backButton.click()
    expect(onDrillUp).toHaveBeenCalledTimes(1)
  })
})
