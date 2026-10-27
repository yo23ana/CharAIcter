import { FastText } from 'fasttext.wasm'

import { alphabets, type AlphabetScript } from '@charaicter/shared/alphabets'
import type {
  AnalysisResult,
  DetectedLanguage,
} from '@charaicter/shared/analysis'
import { analyzeText } from '@charaicter/shared/analyzer'

export const MAX_INPUT_LENGTH = 100_000
/** Fewer letters than this is too little text to name a language. */
export const MIN_LANGUAGE_LENGTH = 12
/** Below this many letters a language is never reported with high confidence. */
const CONFIDENT_LANGUAGE_LENGTH = 40
/** A second script needs this many letters to count as another language. */
const SECOND_SCRIPT_LENGTH = 20

const undetermined: DetectedLanguage = {
  code: 'und',
  confidence: 'undetermined',
  name: 'Undetermined',
}

// fastText reports ISO 639-1 codes; the rest of the app uses ISO 639-3.
const iso3Codes: Record<string, string> = {
  be: 'bel',
  bg: 'bul',
  bs: 'bos',
  cs: 'ces',
  da: 'dan',
  de: 'deu',
  el: 'ell',
  en: 'eng',
  es: 'spa',
  fi: 'fin',
  fr: 'fra',
  hr: 'hrv',
  hu: 'hun',
  it: 'ita',
  kk: 'kaz',
  ky: 'kir',
  mk: 'mkd',
  mn: 'mon',
  nl: 'nld',
  no: 'nor',
  pl: 'pol',
  pt: 'por',
  ro: 'ron',
  ru: 'rus',
  sk: 'slk',
  sl: 'slv',
  sr: 'srp',
  sv: 'swe',
  tg: 'tgk',
  tr: 'tur',
  uk: 'ukr',
}

// Scripts for languages that have no alphabet entry.
const extraLanguageScripts: Record<string, AlphabetScript> = {
  bos: 'Latin',
  kir: 'Cyrillic',
  mon: 'Cyrillic',
  tgk: 'Cyrillic',
}

// Common words that occur in only one of the Cyrillic languages. fastText is
// unreliable on short Cyrillic text, so these break close calls.
const distinctiveWords: Record<string, string[]> = {
  bul: [
    'беше',
    'бяха',
    'благодаря',
    'във',
    'днес',
    'защото',
    'здравей',
    'които',
    'който',
    'която',
    'което',
    'нещо',
    'няма',
    'обаче',
    'сме',
    'сте',
    'със',
    'също',
    'съм',
    'тези',
    'този',
    'това',
    'ще',
  ],
  mkd: ['денес', 'јас', 'многу', 'ова', 'оваа', 'овој', 'сум', 'ќе'],
  rus: [
    'был',
    'была',
    'были',
    'всё',
    'еще',
    'ещё',
    'здесь',
    'здравствуйте',
    'когда',
    'нет',
    'очень',
    'потому',
    'сегодня',
    'сейчас',
    'спасибо',
    'только',
    'тоже',
    'хорошо',
    'что',
    'это',
  ],
  srp: ['данас', 'ово', 'хвала', 'је', 'јер'],
  ukr: [
    'але',
    'буде',
    'вони',
    'дуже',
    'дякую',
    'немає',
    'привіт',
    'сьогодні',
    'також',
    'тому',
    'це',
    'цей',
    'що',
  ],
}
const DISTINCTIVE_WORD_BONUS = 0.2
const MAX_DISTINCTIVE_BONUS = 0.6

const displayNames = new Intl.DisplayNames(['en'], { type: 'language' })

const fastTextPromise = FastText.create().then(async (detector) => {
  await detector.loadModel()
  return detector
})

const letterScripts: AlphabetScript[] = ['Latin', 'Cyrillic', 'Greek']
// Script regexes are built once; scriptOf runs for every letter checked.
const scriptPatterns = letterScripts.map((script) => ({
  pattern: new RegExp(`\\p{Script=${script}}`, 'u'),
  script,
}))

function scriptOf(letter: string): AlphabetScript | 'Other' {
  return (
    scriptPatterns.find(({ pattern }) => pattern.test(letter))?.script ??
    'Other'
  )
}

function languageScript(code: string) {
  return alphabets[code]?.script ?? extraLanguageScripts[code]
}

/** Letters grouped by script, with the words written in each script. */
function splitByScript(text: string) {
  const groups = new Map<
    AlphabetScript | 'Other',
    { letters: number; words: string[] }
  >()
  for (const [word] of text.matchAll(/[\p{L}\p{M}]+/gu)) {
    const letters = word.match(/\p{L}/gu) ?? []
    const script = scriptOf(letters[0] ?? '')
    const group = groups.get(script) ?? { letters: 0, words: [] }
    group.letters += letters.length
    group.words.push(word)
    groups.set(script, group)
  }
  // Map order is first appearance, so languages are listed in reading order.
  return [...groups.entries()].map(([script, group]) => ({ script, ...group }))
}

// Share of the text's letters that the language's alphabet lacks, as a score
// penalty. One stray letter costs little, so it can still be reported as a
// letter outside the alphabet; many such letters rule the language out.
function alphabetPenalty(code: string, letters: string[]) {
  const alphabet = alphabets[code]
  if (alphabet === undefined || letters.length === 0) return 0
  const outside = letters.filter(
    (letter) =>
      scriptOf(letter) === alphabet.script &&
      !alphabet.letters.includes(letter),
  ).length
  return Math.min(0.6, (outside / letters.length) * 15)
}

function distinctiveBonus(code: string, words: Set<string>) {
  const hits = (distinctiveWords[code] ?? []).filter((word) =>
    words.has(word),
  ).length
  return Math.min(MAX_DISTINCTIVE_BONUS, hits * DISTINCTIVE_WORD_BONUS)
}

async function detectInScript(
  text: string,
  script: AlphabetScript | 'Other',
  letterCount: number,
): Promise<DetectedLanguage> {
  const lowerText = text.normalize('NFC').toLowerCase()
  const letters = lowerText.match(/\p{L}/gu) ?? []
  const words = new Set(lowerText.match(/[\p{L}\p{M}]+/gu) ?? [])
  const predictions = new Map<string, number>()
  for (const [label, probability] of (await fastTextPromise).predict(
    text.replace(/\s+/g, ' '),
    10,
    0,
  )) {
    const iso1 = label.slice('__label__'.length)
    predictions.set(iso3Codes[iso1] ?? iso1, probability)
  }
  // Every Cyrillic language is a candidate, since distinctive words can
  // outweigh a weak fastText score.
  if (script === 'Cyrillic') {
    for (const code of Object.keys(distinctiveWords)) {
      if (!predictions.has(code)) predictions.set(code, 0)
    }
  }

  const ranked = [...predictions.entries()]
    .filter(([code]) => {
      const expected = languageScript(code)
      // Cyrillic and Greek text must match a language known to use that
      // script; Latin covers too many languages to require an entry.
      if (script === 'Cyrillic' || script === 'Greek') {
        return expected === script
      }
      return expected === undefined || expected === script
    })
    .map(([code, probability]) => ({
      code,
      score:
        probability -
        alphabetPenalty(code, letters) +
        distinctiveBonus(code, words),
    }))
    .sort((left, right) => right.score - left.score)

  const [top, second] = ranked
  if (top === undefined) return undetermined
  const margin = top.score - (second?.score ?? 0)
  const isUsable =
    top.score >= 0.5 ||
    (letterCount >= 50 && top.score >= 0.35 && margin >= 0.25)
  if (!isUsable) return undetermined

  const iso1 =
    Object.entries(iso3Codes).find(([, iso3]) => iso3 === top.code)?.[0] ??
    top.code
  return {
    code: top.code,
    confidence:
      top.score >= 0.8 &&
      margin >= 0.3 &&
      letterCount >= CONFIDENT_LANGUAGE_LENGTH
        ? 'high'
        : 'low',
    name: displayNames.of(iso1) ?? top.code,
  }
}

export async function detectLanguage(text: string): Promise<DetectedLanguage> {
  const groups = splitByScript(text)
  const totalLetters = groups.reduce((sum, group) => sum + group.letters, 0)
  if (totalLetters < MIN_LANGUAGE_LENGTH) return undetermined

  // Substantial text in two scripts is detected one script at a time.
  const substantial = groups.filter(
    (group) =>
      group.script !== 'Other' && group.letters >= SECOND_SCRIPT_LENGTH,
  )
  if (substantial.length > 1) {
    const detected = await Promise.all(
      substantial.map((group) =>
        detectInScript(group.words.join(' '), group.script, group.letters),
      ),
    )
    const languages = detected.filter(
      (language) => language.confidence !== 'undetermined',
    )
    if (new Set(languages.map((language) => language.code)).size > 1) {
      return {
        code: 'mul',
        // Two substantial scripts with different languages is a strong
        // signal on its own, even when each part is short.
        confidence: 'high',
        languages: languages.map((language) => language.name),
        name: 'Multiple languages detected',
      }
    }
  }

  const dominant = groups.reduce((best, group) =>
    group.letters > best.letters ? group : best,
  )
  return detectInScript(text, dominant.script, totalLetters)
}

export async function analyzeInput(text: string): Promise<AnalysisResult> {
  return {
    language: await detectLanguage(text),
    findings: analyzeText(text, { symbols: true }),
  }
}
