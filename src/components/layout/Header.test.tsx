import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Header } from './Header'

const mockSetTheme = vi.fn()

vi.mock('next-auth/react', () => ({
  useSession: vi.fn().mockReturnValue({ data: null }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: mockSetTheme }),
}))

describe('Header', () => {
  it('toggles to light when current theme is dark', async () => {
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByRole('button', { name: /テーマ切替/i }))

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
