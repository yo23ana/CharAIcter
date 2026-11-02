import { describe, expect, it, vi } from 'vitest'

import { detectLanguage, type PredictLanguages } from './language.js'

// A stand-in for fastText that always returns the same predictions.
const predicting =
  (...predictions: [code: string, probability: number][]): PredictLanguages =>
  () =>
    predictions.map(([code, probability]) => ({ code, probability }))

describe('detectLanguage', () => {
  it('does not ask the model about text with too few letters', () => {
    const predict = vi.fn(predicting(['en', 0.99]))

    expect(detectLanguage('Hi there!', predict)).toMatchObject({
      code: 'und',
      confidence: 'undetermined',
    })
    expect(predict).not.toHaveBeenCalled()
  })

  it('reports a confident prediction with its ISO 639-3 code and name', () => {
    const text = 'The weather is lovely today, so we are walking to the park.'

    expect(
      detectLanguage(text, predicting(['en', 0.95], ['fr', 0.02])),
    ).toEqual({ code: 'eng', confidence: 'high', name: 'English' })
  })

  it('keeps only languages written in the script of the text', () => {
    const text = 'Днес времето е хубаво и слънчево навън'

    // English is dropped as a Latin-script language, and the distinctive
    // Bulgarian word "днес" lifts Bulgarian above Russian.
    expect(
      detectLanguage(text, predicting(['en', 0.9], ['ru', 0.45], ['bg', 0.4])),
    ).toMatchObject({ code: 'bul', confidence: 'low' })
  })

  it('rules out a language whose alphabet lacks letters in the text', () => {
    const text = 'Мы были дома весь вечер и смотрели кино'

    // "ы" is not in the Bulgarian alphabet, and "были" is a Russian word.
    expect(
      detectLanguage(text, predicting(['bg', 0.7], ['ru', 0.6])),
    ).toMatchObject({ code: 'rus' })
  })

  it('detects substantial text in two scripts one script at a time', () => {
    const predict: PredictLanguages = (text) =>
      /\p{Script=Cyrillic}/u.test(text)
        ? [{ code: 'ru', probability: 0.95 }]
        : [{ code: 'en', probability: 0.95 }]
    const text =
      'The meeting starts tomorrow morning. Встреча начнётся завтра утром.'

    expect(detectLanguage(text, predict)).toEqual({
      code: 'mul',
      confidence: 'high',
      languages: ['English', 'Russian'],
      name: 'Multiple languages detected',
    })
  })

  it('reports a weak prediction as undetermined', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur'

    expect(detectLanguage(text, predicting(['en', 0.2]))).toMatchObject({
      code: 'und',
      confidence: 'undetermined',
    })
  })
})
