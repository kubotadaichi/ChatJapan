'use client'

import { Button } from '@/components/ui/button'
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SessionSidebar } from '@/components/session/SessionSidebar'
import { useMapSelection } from '@/hooks/useMapSelection'
import { useSessionManager } from '@/hooks/useSessionManager'
import { ChevronLeft, PanelLeftOpen } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function Home() {
  const { data: authSession } = useSession()
  const isLoggedIn = !!authSession?.user
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)

  const {
    selectedArea,
    selectionMode,
    focusedPrefecture,
    selectArea,
    clearSelection,
    enterMunicipalityMode,
    exitMunicipalityMode,
  } = useMapSelection()

  const {
    sessions,
    currentSessionId,
    startNewSession,
    selectSession,
    handleSessionCreated,
    handleTitleGenerated,
    deleteSession,
  } = useSessionManager(isLoggedIn)

  const sidebar = isLoggedIn ? (
    isSidebarCollapsed ? (
      <div className="flex h-full w-14 flex-col items-center border-r border-border bg-muted/40 px-2 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(false)}
          aria-label="サイドバーを開く"
          className="size-8"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <div className="h-full w-[160px] min-w-[140px]">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewSession={startNewSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          headerAction={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(true)}
              aria-label="サイドバーを閉じる"
              className="size-8 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    )
  ) : undefined

  const mapPane = isMapOpen ? (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">地図</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMapOpen(false)}
          aria-label="地図を閉じる"
          className="h-7 px-2 text-xs"
        >
          閉じる
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          selectionMode={selectionMode}
          focusedPrefecture={focusedPrefecture}
          onEnterMunicipalityMode={enterMunicipalityMode}
          onExitMunicipalityMode={exitMunicipalityMode}
        />
      </div>
    </div>
  ) : undefined

  return (
    <ThreeColumnLayout
      sidebar={sidebar}
      center={mapPane}
      right={
        <ChatPanel
          selectedArea={selectedArea}
          onAreaClear={clearSelection}
          sessionId={currentSessionId}
          onSessionCreated={handleSessionCreated}
          onTitleGenerated={handleTitleGenerated}
          isMapOpen={isMapOpen}
          onToggleMap={() => setIsMapOpen((prev) => !prev)}
        />
      }
    />
  )
}
