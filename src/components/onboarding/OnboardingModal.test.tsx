import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, it, expect } from 'vitest'
import { OnboardingModal } from './OnboardingModal'

describe('OnboardingModal', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('初回アクセス時にモーダルが表示される', () => {
    render(<OnboardingModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('閉じるボタンでモーダルが消える', () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByRole('button', { name: /使い方を理解しました|はじめる/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('localStorageに guided フラグが保存される', () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByRole('button', { name: /使い方を理解しました|はじめる/ }))
    expect(window.localStorage.getItem('guided')).toBe('1')
  })

  it('すでに guided フラグがある場合はモーダルを表示しない', () => {
    window.localStorage.setItem('guided', '1')
    render(<OnboardingModal />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
