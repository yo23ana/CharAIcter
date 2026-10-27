import type { AnalysisResult } from '@charAIcter/shared/analysis'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function analyzeTextWithApi(
  text: string,
): Promise<AnalysisResult> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}/analyze`, {
      body: JSON.stringify({ text }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  } catch {
    throw new ApiError(
      'The analysis service could not be reached. Check that the API is running and try again.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      `The analysis service returned an error (${response.status}). Please try again.`,
      response.status,
    )
  }

  try {
    return (await response.json()) as AnalysisResult
  } catch {
    throw new ApiError(
      'The analysis service returned an invalid response. Please try again.',
      response.status,
    )
  }
}
