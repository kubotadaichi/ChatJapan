'use client'

import { Button } from '@/components/ui/button'
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SessionSidebar } from '@/components/session/SessionSidebar'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
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
    selectedAreas,
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

  const sidebarToggleButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsSidebarCollapsed((prev) => !prev)}
      aria-label={isSidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
      className="size-8"
    >
      {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </Button>
  )

  const desktopSidebar = isLoggedIn ? (
    isSidebarCollapsed ? (
      <div className="p-2">{sidebarToggleButton}</div>
    ) : (
      <div className="h-full w-[160px] min-w-[140px]">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewSession={startNewSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          headerAction={sidebarToggleButton}
        />
      </div>
    )
  ) : undefined

  const mobileSidebar = isLoggedIn ? (
    isSidebarCollapsed ? (
      <div className="flex items-center border-b border-border/60 px-2 py-2">{sidebarToggleButton}</div>
    ) : (
      <div className="h-[36vh] min-h-[200px] border-b border-border/60">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewSession={startNewSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          headerAction={sidebarToggleButton}
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
          selectedAreas={selectedAreas}
          onAreaSelect={selectArea}
          selectionMode={selectionMode}
          focusedPrefecture={focusedPrefecture}
          onEnterMunicipalityMode={enterMunicipalityMode}
          onExitMunicipalityMode={exitMunicipalityMode}
        />
      </div>
    </div>
  ) : undefined

  const chatPane = (
    <ChatPanel
      selectedAreas={selectedAreas}
      onAreaClear={clearSelection}
      onAreaRemove={selectArea}
      onAreaAdd={selectArea}
      sessionId={currentSessionId}
      onSessionCreated={handleSessionCreated}
      onTitleGenerated={handleTitleGenerated}
      isMapOpen={isMapOpen}
      onToggleMap={() => setIsMapOpen((prev) => !prev)}
    />
  )

  return (
    <>
      <OnboardingModal />
      <div className="hidden h-full md:block">
        <ThreeColumnLayout sidebar={desktopSidebar} center={mapPane} right={chatPane} />
      </div>

      <div className="h-full md:hidden">
        <MobileLayout sidebar={mobileSidebar} map={mapPane} chat={chatPane} isMapOpen={isMapOpen} />
      </div>
    </>
  )
}
