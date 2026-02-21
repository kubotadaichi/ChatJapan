'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function Header() {
    const { data: session } = useSession()
    const { resolvedTheme, setTheme } = useTheme()
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

    return (
        <header className="h-12 border-b flex items-center justify-between px-4 bg-background shrink-0">
            <span className="font-semibold text-sm">ChatJapan</span>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label="テーマ切替"
                    onClick={() => setTheme(nextTheme)}
                >
                    テーマ
                </Button>
                {session ? (
                    <>
                        <span className="text-xs text-muted-foreground">{session.user?.email}</span>
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
