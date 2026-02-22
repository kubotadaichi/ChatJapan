import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach } from 'vitest'
import { describe, it, expect, vi } from 'vitest'
import { useSession } from 'next-auth/react'
import { Header } from './Header'

const mockSetTheme = vi.fn()
const mockUseTheme = vi.fn()

vi.mock('next-auth/react', () => ({
  useSession: vi.fn().mockReturnValue({ data: null }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}))

describe('Header', () => {
  beforeEach(() => {
    mockSetTheme.mockReset()
    mockUseTheme.mockReturnValue({ resolvedTheme: 'dark', setTheme: mockSetTheme })
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })
  })

  it('toggles to light when current theme is dark', async () => {
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByRole('button', { name: /テーマ切替/i }))

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('falls back to dark when theme is unresolved', async () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: undefined, setTheme: mockSetTheme })

    const user = userEvent.setup()
    render(<Header />)

    const toggle = screen.getByRole('button', { name: /テーマ切替/i })
    expect(toggle.querySelector('.lucide-sun')).toBeInTheDocument()

    await user.click(toggle)
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('ログイン中はアバターボタンを表示する', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: 'テストユーザー', email: 'test@example.com', image: null },
        expires: '',
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Header />)

    expect(screen.getByRole('button', { name: /アカウントメニュー/ })).toBeInTheDocument()
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
  })

  it('未ログインはログインボタンを表示する', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })

    render(<Header />)
    expect(screen.getByRole('button', { name: /ログイン/ })).toBeInTheDocument()
  })
})
