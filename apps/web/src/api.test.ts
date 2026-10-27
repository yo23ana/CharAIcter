import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, analyzeTextWithApi } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('analyzeTextWithApi', () => {
  it('sends text and returns the API analysis result', async () => {
    const result = {
      findings: [],
      language: {
        code: 'eng',
        confidence: 'low' as const,
        name: 'English',
      },
    }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }))

    await expect(analyzeTextWithApi('Hello world')).resolves.toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/analyze',
      expect.objectContaining({
        body: JSON.stringify({ text: 'Hello world' }),
        method: 'POST',
      }),
    )
  })

  it('turns network and unsuccessful HTTP responses into actionable errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    await expect(analyzeTextWithApi('Hello')).rejects.toEqual(
      new ApiError(
        'The analysis service could not be reached. Check that the API is running and try again.',
      ),
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 503 }),
    )
    await expect(analyzeTextWithApi('Hello')).rejects.toEqual(
      new ApiError(
        'The analysis service returned an error (503). Please try again.',
        503,
      ),
    )
  })
})
