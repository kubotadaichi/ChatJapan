'use client'

import { ReactNode } from 'react'

interface ThreeColumnLayoutProps {
  sidebar?: ReactNode
  center?: ReactNode
  right: ReactNode
}

export function ThreeColumnLayout({ sidebar, center, right }: ThreeColumnLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {sidebar && <aside className="h-full shrink-0">{sidebar}</aside>}
      <div className="flex h-full min-w-0 flex-1">
        <div className={`min-w-0 border-r border-border ${center ? 'flex-1' : 'hidden'}`}>{center}</div>
        <div className={`h-full min-w-0 ${center ? 'w-[480px] shrink-0' : 'flex-1'}`}>
          {right}
        </div>
      </div>
    </div>
  )
}
