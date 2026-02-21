import { ReactNode } from 'react'

interface SplitLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 min-w-0 border-r border-zinc-200">
        {left}
      </div>
      <div className="flex flex-col w-[480px] shrink-0">
        {right}
      </div>
    </div>
  )
}
