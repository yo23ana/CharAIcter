// Finds literal invisible, control, and other special characters in source
// files. They should be written as \u escapes so they stay visible in review.
//
//   node scripts/check-special-characters.mjs           every tracked text file
//   node scripts/check-special-characters.mjs a.ts b.md those files
//   node scripts/check-special-characters.mjs --hook    the file named in a
//     Claude Code PostToolUse payload on stdin; exits 2 so Claude fixes it
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'

const checkedExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yml',
])
const skippedFiles = new Set(['package-lock.json'])

// Characters that look blank or like ordinary letters but are not categorized
// as format, control, or space characters.
const fillers = new Map([
  [0x034f, 'combining grapheme joiner'],
  [0x115f, 'Hangul choseong filler'],
  [0x1160, 'Hangul jungseong filler'],
  [0x2800, 'Braille pattern blank'],
  [0x3164, 'Hangul filler'],
  [0xfffd, 'replacement character'],
  [0xffa0, 'halfwidth Hangul filler'],
])

const names = new Map([
  [0x00a0, 'no-break space'],
  [0x00ad, 'soft hyphen'],
  [0x200b, 'zero-width space'],
  [0x200c, 'zero-width non-joiner'],
  [0x200d, 'zero-width joiner'],
  [0x200e, 'left-to-right mark'],
  [0x200f, 'right-to-left mark'],
  [0x2028, 'line separator'],
  [0x2029, 'paragraph separator'],
  [0x202e, 'right-to-left override'],
  [0x2060, 'word joiner'],
  [0xfeff, 'byte order mark / zero-width no-break space'],
  ...fillers,
])

function isSpecial(character) {
  const codePoint = character.codePointAt(0)
  if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) {
    return false
  }
  if (codePoint === 0x20) return false
  return (
    /[\p{Cc}\p{Cf}\p{Co}\p{Zs}\p{Zl}\p{Zp}]/u.test(character) ||
    fillers.has(codePoint)
  )
}

function label(codePoint) {
  const hex = codePoint.toString(16).toUpperCase().padStart(4, '0')
  const name = names.get(codePoint)
  return name === undefined ? `U+${hex}` : `U+${hex} (${name})`
}

function scanFile(file) {
  const problems = []
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      let column = 1
      for (const character of line) {
        if (isSpecial(character)) {
          problems.push(
            `${file}:${index + 1}:${column}  ${label(character.codePointAt(0))}`,
          )
        }
        column += 1
      }
    })
  return problems
}

function shouldCheck(file) {
  const name = file.split(/[\\/]/).pop() ?? ''
  return (
    checkedExtensions.has(extname(file)) &&
    !skippedFiles.has(name) &&
    existsSync(file)
  )
}

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

async function readStdin() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  return input
}

const advice =
  'Write these characters as \\u escapes (for example \\u200B) instead of ' +
  'literal characters, so they stay visible in code review.'

if (process.argv[2] === '--hook') {
  const payload = JSON.parse(await readStdin())
  const file = payload.tool_response?.filePath ?? payload.tool_input?.file_path
  if (typeof file !== 'string' || !shouldCheck(file)) process.exit(0)

  const problems = scanFile(file)
  if (problems.length > 0) {
    console.error(
      `Literal special characters found:\n${problems.slice(0, 20).join('\n')}\n${advice}`,
    )
    process.exit(2)
  }
  process.exit(0)
}

const files = (
  process.argv.length > 2 ? process.argv.slice(2) : trackedFiles()
).filter(shouldCheck)
const problems = files.flatMap(scanFile)
if (problems.length > 0) {
  console.error(problems.join('\n'))
  console.error(advice)
  process.exit(1)
}
console.log(`No literal special characters in ${files.length} files.`)
