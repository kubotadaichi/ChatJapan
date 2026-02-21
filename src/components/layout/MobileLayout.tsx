import { ReactNode } from 'react'

interface MobileLayoutProps {
  sidebar?: ReactNode
  map?: ReactNode
  chat: ReactNode
  isMapOpen: boolean
}

export function MobileLayout({ sidebar, map, chat, isMapOpen }: MobileLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {sidebar ? <div className="shrink-0">{sidebar}</div> : null}

      {isMapOpen ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="h-[45%] min-h-[200px] overflow-hidden border-b border-border">{map}</div>
          <div className="min-h-0 flex-1">{chat}</div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">{chat}</div>
      )}
    </div>
  )
}
