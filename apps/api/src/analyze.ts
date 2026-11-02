import { FastText } from 'fasttext.wasm'

import type {
  AnalysisResult,
  DetectedLanguage,
} from '@charaicter/shared/analysis'
import { analyzeText } from '@charaicter/shared/analyzer'
import {
  detectLanguage,
  type PredictLanguages,
} from '@charaicter/shared/language'

export const MAX_INPUT_LENGTH = 100_000

// fastText LID-176, loaded once at startup. It reads a single line and labels
// languages as `__label__bg`; the shared rules get its 10 likeliest.
const predictWithFastText: Promise<PredictLanguages> = FastText.create().then(
  async (model) => {
    await model.loadModel()
    return (text) =>
      Array.from(
        model.predict(text.replace(/\s+/g, ' '), 10, 0),
        ([label, probability]) => ({
          code: label.slice('__label__'.length),
          probability,
        }),
      )
  },
)

/** Detects the text's language with fastText and the shared language rules. */
export async function detectLanguageWithFastText(
  text: string,
): Promise<DetectedLanguage> {
  return detectLanguage(text, await predictWithFastText)
}

export async function analyzeInput(text: string): Promise<AnalysisResult> {
  return {
    language: await detectLanguageWithFastText(text),
    findings: analyzeText(text, { symbols: true }),
  }
}
