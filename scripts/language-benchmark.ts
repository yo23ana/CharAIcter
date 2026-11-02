import { performance } from 'node:perf_hooks'

import { franc } from 'franc'

import {
  languageCorpus,
  languageEdgeCases,
} from '../apps/api/src/fixtures/languageCorpus.js'
import { detectLanguageWithFastText } from '../apps/api/src/analyze.js'

type BenchmarkResult = {
  accuracy: number
  baselineAccuracy: number
  baselineCorrect: number
  confusion: Array<{ actual: string; count: number; predicted: string }>
  correct: number
  elapsedMs: number
  total: number
  undetermined: number
}

export async function benchmarkCorpus(): Promise<BenchmarkResult> {
  const confusion = new Map<string, number>()
  let baselineCorrect = 0
  let correct = 0
  let undetermined = 0
  const startedAt = performance.now()

  for (const entry of languageCorpus) {
    if (franc(entry.text, { minLength: 20 }) === entry.code) {
      baselineCorrect += 1
    }

    const predicted = (await detectLanguageWithFastText(entry.text)).code
    if (predicted === 'und') undetermined += 1
    if (predicted === entry.code) {
      correct += 1
    } else {
      const key = `${entry.code}:${predicted}`
      confusion.set(key, (confusion.get(key) ?? 0) + 1)
    }
  }

  const total = languageCorpus.length
  return {
    accuracy: total === 0 ? 0 : correct / total,
    baselineAccuracy: total === 0 ? 0 : baselineCorrect / total,
    baselineCorrect,
    confusion: [...confusion.entries()].map(([key, count]) => {
      const [actual, predicted] = key.split(':')
      return { actual, count, predicted }
    }),
    correct,
    elapsedMs: performance.now() - startedAt,
    total,
    undetermined,
  }
}

const result = await benchmarkCorpus()
console.log(`Language corpus: ${result.correct}/${result.total} correct`)
console.log(`Accuracy: ${(result.accuracy * 100).toFixed(1)}%`)
console.log(
  `franc baseline: ${result.baselineCorrect}/${result.total} correct (${(result.baselineAccuracy * 100).toFixed(1)}%)`,
)
console.log(`Undetermined: ${result.undetermined}`)
console.log(`Inference time: ${result.elapsedMs.toFixed(1)} ms total`)
for (const edgeCase of languageEdgeCases) {
  const detected = await detectLanguageWithFastText(edgeCase.text)
  console.log(`Edge case (${edgeCase.name}): ${detected.code}`)
}
console.log(
  `Confusions: ${
    result.confusion.length === 0
      ? 'none'
      : result.confusion
          .map(
            ({ actual, count, predicted }) =>
              `${actual}->${predicted} (${count})`,
          )
          .join(', ')
  }`,
)
