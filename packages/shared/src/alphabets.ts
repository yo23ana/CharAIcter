export type AlphabetScript = 'Cyrillic' | 'Greek' | 'Latin'

export interface Alphabet {
  /** Lowercase letters of the alphabet, in NFC form. */
  letters: string
  script: AlphabetScript
}

const latin = 'abcdefghijklmnopqrstuvwxyz'

/** Alphabets keyed by ISO 639-3 language code. */
export const alphabets: Record<string, Alphabet> = {
  bel: { letters: 'абвгдеёжзійклмнопрстуўфхцчшыьэюя', script: 'Cyrillic' },
  bul: { letters: 'абвгдежзийклмнопрстуфхцчшщъьюя', script: 'Cyrillic' },
  ces: { letters: `${latin}áčďéěíňóřšťúůýž`, script: 'Latin' },
  dan: { letters: `${latin}æøå`, script: 'Latin' },
  deu: { letters: `${latin}äöüß`, script: 'Latin' },
  ell: { letters: 'αβγδεζηθικλμνξοπρσςτυφχψωάέήίόύώϊϋΐΰ', script: 'Greek' },
  eng: { letters: latin, script: 'Latin' },
  fin: { letters: `${latin}åäö`, script: 'Latin' },
  fra: { letters: `${latin}àâæçéèêëîïôœùûüÿ`, script: 'Latin' },
  hrv: { letters: `${latin}čćđšž`, script: 'Latin' },
  hun: { letters: `${latin}áéíóöőúüű`, script: 'Latin' },
  ita: { letters: `${latin}àèéìíîòóùú`, script: 'Latin' },
  kaz: {
    letters: 'аәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыіьэюя',
    script: 'Cyrillic',
  },
  mkd: { letters: 'абвгдѓежзѕијклљмнњопрстќуфхцчџш', script: 'Cyrillic' },
  nld: { letters: `${latin}áéëíïóöúü`, script: 'Latin' },
  nor: { letters: `${latin}æøå`, script: 'Latin' },
  pol: { letters: `${latin}ąćęłńóśźż`, script: 'Latin' },
  por: { letters: `${latin}áâãàçéêíóôõú`, script: 'Latin' },
  ron: { letters: `${latin}ăâîșțşţ`, script: 'Latin' },
  rus: { letters: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя', script: 'Cyrillic' },
  slk: { letters: `${latin}áäčďéíĺľňóôŕšťúýž`, script: 'Latin' },
  slv: { letters: `${latin}čšž`, script: 'Latin' },
  spa: { letters: `${latin}áéíñóúü`, script: 'Latin' },
  srp: { letters: 'абвгдђежзијклљмнњопрстћуфхцчџш', script: 'Cyrillic' },
  swe: { letters: `${latin}åäö`, script: 'Latin' },
  tur: { letters: `${latin}çğıöşü`, script: 'Latin' },
  ukr: { letters: 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя', script: 'Cyrillic' },
}
