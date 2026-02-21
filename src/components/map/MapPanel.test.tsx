import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MapPanel } from "./MapPanel"
import type { SelectedArea } from "@/lib/types"

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      setFeatureState: vi.fn(),
      getFeatureState: vi.fn(),
      getCanvas: vi.fn().mockReturnValue({ style: {} }),
    })),
    supported: vi.fn().mockReturnValue(true),
  },
}))

describe("MapPanel", () => {
  it("renders the map container", () => {
    const onSelect = vi.fn()
    render(<MapPanel selectedArea={null} onAreaSelect={onSelect} />)
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
    render(<MapPanel selectedArea={area} onAreaSelect={onSelect} />)
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
    render(<MapPanel selectedArea={area} onAreaSelect={onSelect} />)
    expect(screen.getByRole("button", { name: /選択解除/ })).toBeInTheDocument()
  })
})
