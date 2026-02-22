import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const {
  mockStreamText,
  mockConvertToModelMessages,
  mockStepCountIs,
  mockOpenAI,
  mockCreateStatisticsTools,
} = vi.hoisted(() => ({
  mockStreamText: vi.fn(),
  mockConvertToModelMessages: vi.fn(),
  mockStepCountIs: vi.fn(),
  mockOpenAI: vi.fn(),
  mockCreateStatisticsTools: vi.fn(),
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
  convertToModelMessages: mockConvertToModelMessages,
  stepCountIs: mockStepCountIs,
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: mockOpenAI,
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(),
}))

vi.mock('@/lib/llm/tools', () => ({
  createStatisticsTools: mockCreateStatisticsTools,
}))

beforeEach(() => {
  vi.clearAllMocks()

  process.env.ESTAT_API_KEY = 'test-key'
  process.env.LLM_PROVIDER = 'openai'
  process.env.LLM_MODEL = 'gpt-4o'

  mockOpenAI.mockReturnValue('mock-model')
  mockStepCountIs.mockReturnValue('mock-stop-condition')
  mockConvertToModelMessages.mockResolvedValue([])
  mockCreateStatisticsTools.mockReturnValue({ statistics: 'mock-tool' })
  mockStreamText.mockReturnValue({
    toUIMessageStreamResponse: () => new Response('ok', { status: 200 }),
  })
})

describe('POST /api/chat', () => {
  it('ChatJapan向けの詳細システムプロンプトを使用する', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [],
        selectedAreas: [{ name: '渋谷区', code: '13113', prefCode: '13' }],
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockStreamText).toHaveBeenCalledTimes(1)

    const args = mockStreamText.mock.calls[0]?.[0]
    expect(args.system).toContain('あなたは「ChatJapan」の統計データアナリストです。')
    expect(args.system).toContain('必ず日本語で回答する')
    expect(args.system).toContain('データの出典と調査年度を明示する')
    expect(args.system).toContain('coverageMismatch または note が返った場合は、使用したデータレベルを明記する')
    expect(args.system).toContain('選択中のエリア（1件）')
    expect(args.system).toContain('1. 渋谷区 (コード: 13113, 都道府県コード: 13)')
  })
})
