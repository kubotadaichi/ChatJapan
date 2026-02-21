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
        selectionMode="prefecture"
        focusedPrefecture={null}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.getByTestId("map-container")).toBeInTheDocument()
  })

  it("does not show selected area overlay when area is selected", () => {
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
        selectionMode="prefecture"
        focusedPrefecture={null}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.queryByText("渋谷区を選択中")).not.toBeInTheDocument()
  })

  it("does not show clear button when area is selected", () => {
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
        selectionMode="prefecture"
        focusedPrefecture={null}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.queryByRole("button", { name: /選択解除/ })).not.toBeInTheDocument()
  })

  it('shows focused prefecture name when selectionMode is municipality', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        selectionMode="municipality"
        focusedPrefecture={{
          name: '東京都',
          code: '13',
          prefCode: '13',
          level: 'prefecture',
        }}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.getByText(/東京都/)).toBeInTheDocument()
  })

  it('does not show prefecture indicator when selectionMode is prefecture', () => {
    render(
      <MapPanel
        selectedArea={null}
        onAreaSelect={vi.fn()}
        selectionMode="prefecture"
        focusedPrefecture={null}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.queryByText(/の市区町村/)).not.toBeInTheDocument()
  })

  it('does not render selected-area overlay even when selected', () => {
    const area = { name: '渋谷区', code: '13113', prefCode: '13', level: 'municipality' } as const
    render(
      <MapPanel
        selectedArea={area}
        onAreaSelect={vi.fn()}
        selectionMode="prefecture"
        focusedPrefecture={null}
        onEnterMunicipalityMode={vi.fn()}
        onExitMunicipalityMode={vi.fn()}
      />
    )
    expect(screen.queryByText('渋谷区を選択中')).not.toBeInTheDocument()
  })
})
