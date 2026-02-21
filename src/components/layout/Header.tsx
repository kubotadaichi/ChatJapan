'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Header() {
    const { data: session } = useSession()

    return (
        <header className="h-12 border-b flex items-center justify-between px-4 bg-white shrink-0">
            <span className="font-semibold text-sm">ChatJapan</span>
            <div className="flex items-center gap-2">
                {session ? (
                    <>
                        <span className="text-xs text-zinc-500">{session.user?.email}</span>
                        <Button variant="ghost" size="sm" onClick={() => signOut()}>
                            ログアウト
                        </Button>
                    </>
                ) : (
                    <Button variant="ghost" size="sm" onClick={() => signIn('google')}>
                        ログイン
                    </Button>
                )}
            </div>
        </header>
    )
}
