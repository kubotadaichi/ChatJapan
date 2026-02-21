'use client'

import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { MapPanel } from '@/components/map/MapPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SessionSidebar } from '@/components/session/SessionSidebar'
import { useMapSelection } from '@/hooks/useMapSelection'
import { useSessionManager } from '@/hooks/useSessionManager'
import { useSession } from 'next-auth/react'

export default function Home() {
  const { data: authSession } = useSession()
  const isLoggedIn = !!authSession?.user

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
    <SessionSidebar
      sessions={sessions}
      currentSessionId={currentSessionId}
      onNewSession={startNewSession}
      onSelectSession={selectSession}
      onDeleteSession={deleteSession}
    />
  ) : undefined

  return (
    <ThreeColumnLayout
      sidebar={sidebar}
      center={
        <MapPanel
          selectedArea={selectedArea}
          onAreaSelect={selectArea}
          selectionMode={selectionMode}
          focusedPrefecture={focusedPrefecture}
          onEnterMunicipalityMode={enterMunicipalityMode}
          onExitMunicipalityMode={exitMunicipalityMode}
        />
      }
      right={
        <ChatPanel
          selectedArea={selectedArea}
          onAreaClear={clearSelection}
          sessionId={currentSessionId}
          onSessionCreated={handleSessionCreated}
          onTitleGenerated={handleTitleGenerated}
        />
      }
    />
  )
}
