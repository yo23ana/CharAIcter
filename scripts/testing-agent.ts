import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type PackageJson = {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export type RepositoryReport = {
  files: number
  languages: string[]
  frameworks: string[]
  testFiles: string[]
  exportedSymbols: string[]
  scripts: Record<string, string>
  architecture: string[]
}

export type TestGenerationResult = {
  path: string
  status: 'created' | 'exists'
  cases: number
}

export type TestCycleReport = {
  repository: RepositoryReport
  generated: TestGenerationResult
  testCommand: string
  testPassed: boolean
  testOutput: string
  coverage: 'not-configured'
  bugs: string[]
  remainingRisks: string[]
}

const ignoredDirectories = new Set([
  '.git',
  '.vite',
  'coverage',
  'dist',
  'node_modules',
])
const generatedTestPath = [
  'packages',
  'shared',
  'src',
  'analyzer.generated.test.ts',
]
const generatedTest = `import { describe, expect, it } from 'vitest'

import { analyzeText } from './analyzer.js'

describe('generated analyzer edge cases', () => {
  it('keeps positions in code points when text contains an emoji', () => {
    const findings = analyzeText('🙂a\\u200Bb')

    expect(findings[0]).toMatchObject({
      category: 'invisible',
      linePosition: 3,
      codePoint: 'U+200B',
    })
  })

  it('detects control and replacement characters together', () => {
    const findings = analyzeText('a\\u0001b\\uFFFDb')

    expect(findings.map((finding) => finding.category)).toEqual([
      'control',
      'replacement',
    ])
  })

  it('returns no findings for empty input', () => {
    expect(analyzeText('')).toEqual([])
  })
})
`

function packageJson(root: string) {
  return JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as PackageJson
}

function sourceFiles(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : sourceFiles(root, path)
    }

    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [path] : []
  })
}

function relativePath(root: string, path: string) {
  return relative(root, path).replaceAll('\\', '/')
}

export function inspectRepository(root: string): RepositoryReport {
  const packageData = packageJson(root)
  const dependencies = {
    ...packageData.dependencies,
    ...packageData.devDependencies,
  }
  const files = sourceFiles(root)
  const extensions = new Set(files.map((file) => file.split('.').pop()))
  const testFiles = files
    .filter((file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file))
    .map((file) => relativePath(root, file))
  const exportedSymbols = files.flatMap((file) => {
    const content = readFileSync(file, 'utf8')
    return [
      ...content.matchAll(
        /export\s+(?:async\s+)?(?:function|class|const|type|interface)\s+(\w+)/g,
      ),
    ].map((match) => `${relativePath(root, file)}:${match[1]}`)
  })

  const frameworks = [
    dependencies.react && 'React',
    dependencies.fastify && 'Fastify',
    dependencies.vitest && 'Vitest',
    dependencies.vite && 'Vite',
  ].filter((framework): framework is string => Boolean(framework))

  return {
    files: files.length,
    languages: [
      extensions.has('ts') || extensions.has('tsx') ? 'TypeScript' : null,
      extensions.has('js') || extensions.has('jsx') ? 'JavaScript' : null,
    ].filter((language): language is string => Boolean(language)),
    frameworks,
    testFiles,
    exportedSymbols,
    scripts: packageData.scripts ?? {},
    architecture: [
      existsSync(join(root, 'packages', 'shared'))
        ? 'Shared analyzer package in packages/shared'
        : null,
      existsSync(join(root, 'apps', 'web'))
        ? 'React/Vite browser application in apps/web'
        : null,
      existsSync(join(root, 'apps', 'api'))
        ? 'Fastify API boundary in apps/api'
        : null,
      testFiles.length > 0
        ? 'Vitest tests colocated with source modules'
        : null,
    ].filter((item): item is string => Boolean(item)),
  }
}

export function generateTests(root: string): TestGenerationResult {
  const path = join(root, ...generatedTestPath)
  if (existsSync(path)) {
    return { path: relativePath(root, path), status: 'exists', cases: 3 }
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, generatedTest, 'utf8')
  return { path: relativePath(root, path), status: 'created', cases: 3 }
}

export function runTestCycle(root: string): TestCycleReport {
  const repository = inspectRepository(root)
  const generated = generateTests(root)
  const testCommand = 'npm.cmd test -- --reporter=verbose'
  let testPassed = false
  let testOutput: string

  try {
    const isWindows = process.platform === 'win32'
    testOutput = execFileSync(
      isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm',
      isWindows
        ? ['/d', '/s', '/c', 'npm.cmd test -- --reporter=verbose']
        : ['test', '--', '--reporter=verbose'],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    testPassed = true
  } catch (error) {
    const failure = error as {
      stdout?: string
      stderr?: string
      message?: string
    }
    testOutput = [failure.stdout, failure.stderr, failure.message]
      .filter(Boolean)
      .join('\n')
  }

  return {
    repository,
    generated,
    testCommand,
    testPassed,
    testOutput,
    coverage: 'not-configured',
    bugs: testPassed
      ? []
      : [
          'The generated test cycle contains a failing test. Review the output before changing production code.',
        ],
    remainingRisks: [
      'The agent performs static discovery and deterministic test generation; it does not infer business requirements from an external AI model.',
      'React interaction and API endpoint tests are not generated until a browser/API test environment is added.',
      'Coverage is not configured because the repository has no Vitest coverage provider dependency.',
    ],
  }
}

function printReport(report: TestCycleReport) {
  const generation =
    report.generated.status === 'created' ? 'created' : 'already present'
  console.log(`Testing cycle: ${report.testPassed ? 'passed' : 'failed'}`)
  console.log(
    `Repository: ${report.repository.files} source files; ${report.repository.testFiles.length} test files`,
  )
  console.log(
    `Stack: ${report.repository.languages.join(', ')} / ${report.repository.frameworks.join(', ')}`,
  )
  console.log(
    `Tests: ${generation} ${report.generated.cases} generated cases in ${report.generated.path}`,
  )
  console.log(`Command: ${report.testCommand}`)
  console.log(`Coverage: ${report.coverage}`)
  console.log(
    `Bugs: ${report.bugs.length === 0 ? 'none detected' : report.bugs.join(' ')}`,
  )
  console.log('Remaining risks:')
  for (const risk of report.remainingRisks) console.log(`- ${risk}`)
  if (!report.testPassed) console.log(`\n${report.testOutput}`)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const report = runTestCycle(root)
printReport(report)
process.exitCode = report.testPassed ? 0 : 1
