'use client'

import { ReactNode } from 'react'
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels'

interface ThreeColumnLayoutProps {
  sidebar?: ReactNode
  center: ReactNode
  right: ReactNode
}

export function ThreeColumnLayout({ sidebar, center, right }: ThreeColumnLayoutProps) {
  if (!sidebar) {
    return (
      <PanelGroup direction="horizontal" className="h-full w-full">
        <Panel defaultSize={60} minSize={30}>
          {center}
        </Panel>
        <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/30" />
        <Panel defaultSize={40} minSize={25}>
          {right}
        </Panel>
      </PanelGroup>
    )
  }

  return (
    <PanelGroup direction="horizontal" className="h-full w-full">
      <Panel defaultSize={16} minSize={12} maxSize={28} collapsible>
        {sidebar}
      </Panel>
      <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/30" />
      <Panel defaultSize={52} minSize={25}>
        {center}
      </Panel>
      <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/30" />
      <Panel defaultSize={32} minSize={20}>
        {right}
      </Panel>
    </PanelGroup>
  )
}
