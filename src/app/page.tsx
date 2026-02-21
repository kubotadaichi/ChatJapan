import { SplitLayout } from '@/components/layout/SplitLayout'

export default function Home() {
  return (
    <SplitLayout
      left={
        <div className="flex items-center justify-center h-full text-zinc-400">
          Map Panel (coming soon)
        </div>
      }
      right={
        <div className="flex items-center justify-center h-full text-zinc-400">
          Chat Panel (coming soon)
        </div>
      }
    />
  )
}
