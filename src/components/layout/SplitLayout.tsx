import { ReactNode } from 'react'

interface SplitLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="flex-1 min-w-0 border-r border-border">
        {left}
      </div>
      <div className="flex flex-col w-full max-w-[560px] shrink-0 bg-card/40 backdrop-blur-sm">
        {right}
      </div>
    </div>
  )
}
