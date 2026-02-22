'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Moon, Sun, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()

  const currentTheme = resolvedTheme ?? 'dark'
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
  const showSunIcon = currentTheme === 'dark'

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="アカウントメニュー"
                className="rounded-full p-0"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user?.image ?? ''} alt={session.user?.name ?? ''} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                {session.user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>ログアウト</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => signIn('google')}
          >
            ログイン
          </Button>
        )}
      </div>
    </header>
  )
}
