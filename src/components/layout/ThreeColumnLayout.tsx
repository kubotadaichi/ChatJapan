'use client'

import { ReactNode } from 'react'
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels'

interface ThreeColumnLayoutProps {
  sidebar?: ReactNode
  center?: ReactNode
  right: ReactNode
}

export function ThreeColumnLayout({ sidebar, center, right }: ThreeColumnLayoutProps) {
  if (!sidebar && !center) {
    return <div className="h-full w-full">{right}</div>
  }

  if (!sidebar) {
    return (
      <PanelGroup direction="horizontal" className="h-full w-full">
        <Panel defaultSize={50} minSize={30}>
          {center}
        </Panel>
        <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/30" />
        <Panel defaultSize={50} minSize={30}>
          {right}
        </Panel>
      </PanelGroup>
    )
  }

  if (!center) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <aside className="h-full shrink-0">{sidebar}</aside>
        <div className="min-w-0 flex-1">{right}</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="h-full shrink-0">{sidebar}</aside>
      <div className="min-w-0 flex-1">
        <PanelGroup direction="horizontal" className="h-full w-full">
          <Panel defaultSize={50} minSize={30}>
            {center}
          </Panel>
          <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/30" />
          <Panel defaultSize={50} minSize={30}>
            {right}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
