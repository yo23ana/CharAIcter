import type { Finding } from './analyzer.js'

export type DetectedLanguage = {
  code: string
  confidence: 'high' | 'low' | 'undetermined'
  name: string
  languages?: string[]
}

export type AnalysisResult = {
  language: DetectedLanguage
  findings: Finding[]
}
