'use client'

import { useEffect, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
    const { data: session } = useSession()
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const currentTheme = resolvedTheme ?? 'dark'
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
    const showSunIcon = mounted ? currentTheme === 'dark' : true

    return (
        <header className="h-12 border-b border-border/70 flex items-center justify-between px-4 bg-background/90 backdrop-blur shrink-0">
            <span className="font-medium text-sm tracking-tight">ChatJapan</span>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="テーマ切替"
                    onClick={() => setTheme(nextTheme)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    {showSunIcon ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {session ? (
                    <>
                        <span className="text-xs text-muted-foreground">{session.user?.email}</span>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => signOut()}>
                            ログアウト
                        </Button>
                    </>
                ) : (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => signIn('google')}>
                        ログイン
                    </Button>
                )}
            </div>
        </header>
    )
}
