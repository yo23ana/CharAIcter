import { afterEach, describe, expect, it } from 'vitest'

import { languageCorpus } from './languageCorpus.js'
import { buildApp, MAX_INPUT_LENGTH } from './server.js'

const apps: ReturnType<typeof buildApp>[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('POST /analyze', () => {
  it('preserves the health endpoint', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      service: 'charAIcter-api',
      status: 'ok',
    })
  })

  it('returns language metadata and Unicode findings', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 'This is a sufficiently long English sentence.\u200B' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      findings: [
        { category: 'symbol', value: '.' },
        {
          category: 'invisible',
          codePoint: 'U+200B',
        },
      ],
      language: {
        code: 'eng',
        name: 'English',
      },
    })
  })

  it.each(languageCorpus)(
    'returns a language result for $name corpus text',
    async (entry) => {
      const app = buildApp()
      apps.push(app)

      const response = await app.inject({
        method: 'POST',
        url: '/analyze',
        payload: { text: entry.text },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().language.name).not.toBe('Cyrillic text')
    },
  )

  it('rejects missing and non-string text', async () => {
    const app = buildApp()
    apps.push(app)

    const missing = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: {},
    })
    const invalid = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 42 },
    })

    expect(missing.statusCode).toBe(400)
    expect(invalid.statusCode).toBe(400)
  })

  it('accepts empty input without making a language claim', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: '' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      findings: [],
      language: {
        code: 'und',
        confidence: 'undetermined',
        name: 'Undetermined',
      },
    })
  })

  it('does not present a short input as a certain language', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 'hello' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().language.confidence).toBe('undetermined')
  })

  it('marks unsupported text as uncertain', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: '😀🧩🚀🌈🎉🪐🎵🍂🧠🫶' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().language).toMatchObject({
      code: 'und',
      name: 'Undetermined',
    })
    expect(response.json().language.confidence).toBe('undetermined')
  })

  it('returns an actual language with low confidence for ambiguous Cyrillic text', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: {
        text: 'Текст на кирилица без отличителни знаци за езика и без конкретен контекст.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().language).toMatchObject({
      code: 'bul',
      confidence: 'low',
      name: 'Bulgarian',
    })
  })

  it('keeps mixed-script findings separate from language detection', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 'раypal account uses mixed scripts here' },
    })
    const result = response.json()

    expect(response.statusCode).toBe(200)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'mixed-script' }),
      ]),
    )
    expect(result.language.confidence).toBe('undetermined')
  })

  it('suggests multiple languages for substantial Latin and Cyrillic text', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: {
        text: 'This is a sufficiently long English sentence. Это достаточно длинное русское предложение. Русский язык богат.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().language).toMatchObject({
      code: 'mul',
      confidence: 'high',
      name: 'Multiple languages detected',
      languages: ['English', 'Russian'],
    })
  })

  it.each([
    [
      'ita',
      'Italian',
      'Oggi il tempo è bello e molte persone passeggiano nel parco dopo il lavoro.',
    ],
    [
      'por',
      'Portuguese',
      'Hoje o tempo está bom e muitas pessoas caminham no parque depois do trabalho.',
    ],
    [
      'nld',
      'Dutch',
      'Vandaag is het mooi weer en veel mensen wandelen na het werk in het park.',
    ],
    [
      'pol',
      'Polish',
      'Dzisiaj jest ładna pogoda, więc wiele osób spaceruje po parku po pracy.',
    ],
  ])(
    'detects %s beyond the original language list',
    async (code, name, text) => {
      const app = buildApp()
      apps.push(app)

      const response = await app.inject({
        method: 'POST',
        url: '/analyze',
        payload: { text },
      })

      expect(response.json().language).toMatchObject({ code, name })
    },
  )

  it.each([
    ['bul', 'Здравей, как си днес?'],
    ['bul', 'Ще дойда утре, ама не знам кога точно.'],
    ['rus', 'Привет, как дела сегодня?'],
    ['ukr', 'Привіт, як справи сьогодні?'],
  ])('tells short Cyrillic text apart (%s): %s', async (code, text) => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text },
    })

    expect(response.json().language).toMatchObject({ code, confidence: 'low' })
  })

  it('reports symbols for the symbol inspector', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 'Цена: 5€!' },
    })
    const symbols = response
      .json()
      .findings.filter(
        (finding: { category: string }) => finding.category === 'symbol',
      )
      .map((finding: { value: string }) => finding.value)

    expect(symbols).toEqual([':', '€', '!'])
  })

  it('returns unusual whitespace and invisible character findings', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 'text\u2009with\u200Binvisible characters' },
    })
    const categories = response
      .json()
      .findings.map((finding: { category: string }) => finding.category)

    expect(response.statusCode).toBe(200)
    expect(categories).toEqual(['whitespace', 'invisible'])
  })

  it('rejects input over the configured maximum', async () => {
    const app = buildApp()
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/analyze',
      payload: { text: 'a'.repeat(MAX_INPUT_LENGTH + 1) },
    })

    expect(response.statusCode).toBe(400)
  })
})
