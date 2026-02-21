import { ReactNode } from 'react'
import { MobileTabBar } from './MobileTabBar'

type Tab = 'map' | 'chat'

interface MobileLayoutProps {
  left: ReactNode
  right: ReactNode
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function MobileLayout({ left, right, activeTab, onTabChange }: MobileLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <div className={`absolute inset-0 ${activeTab === 'map' ? '' : 'invisible'}`}>{left}</div>
        <div className={`absolute inset-0 ${activeTab === 'chat' ? '' : 'invisible'}`}>{right}</div>
      </div>
      <MobileTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
