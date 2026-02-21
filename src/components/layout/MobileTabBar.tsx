import { Map, MessageCircle } from 'lucide-react'

type Tab = 'map' | 'chat'

interface MobileTabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="flex h-14 shrink-0 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <button
        type="button"
        aria-label="地図"
        onClick={() => onTabChange('map')}
        className={`flex flex-1 flex-col items-center justify-center gap-1 ${
          activeTab === 'map' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        <Map className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="チャット"
        onClick={() => onTabChange('chat')}
        className={`flex flex-1 flex-col items-center justify-center gap-1 ${
          activeTab === 'chat' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </nav>
  )
}
