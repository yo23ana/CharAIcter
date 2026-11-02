// Checks package-lock.json for supply-chain risks. Every installed package
// must come from the npm registry over HTTPS with a sha512 integrity hash, and
// a package that wants install scripts (which .npmrc blocks) fails the check
// until someone reviews it and adds it to reviewedInstallScripts.
//
//   node scripts/check-lockfile.mjs
import { readFileSync } from 'node:fs'

const registry = 'https://registry.npmjs.org/'
// Packages whose install scripts were reviewed and are safe to skip, which
// .npmrc does for every package.
const reviewedInstallScripts = new Set([
  // Only checks its platform binary, which comes from an @esbuild/* package.
  'esbuild',
  // macOS-only and optional; ships a prebuilt binary, the script rebuilds it.
  'fsevents',
])

const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const packages = Object.entries(lockfile.packages ?? {})
const problems = []

if (lockfile.lockfileVersion !== 3) {
  problems.push(`lockfileVersion is ${lockfile.lockfileVersion}, expected 3`)
}

let installed = 0
for (const [path, entry] of packages) {
  if (!path.includes('node_modules/')) continue
  installed += 1
  const name = path.slice(path.lastIndexOf('node_modules/') + 13)

  if (entry.link) {
    // Workspace links must point at a workspace inside this repository.
    if (lockfile.packages[entry.resolved] === undefined) {
      problems.push(`${path}: links to ${entry.resolved}, not a workspace`)
    }
    continue
  }
  if (!entry.resolved?.startsWith(registry)) {
    problems.push(`${path}: resolved from ${entry.resolved}, not ${registry}`)
  }
  if (!entry.integrity?.startsWith('sha512-')) {
    problems.push(`${path}: no sha512 integrity hash`)
  }
  if (entry.hasInstallScript && !reviewedInstallScripts.has(name)) {
    problems.push(`${path}: has install scripts; review it before allowing`)
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`Lockfile OK: ${installed} packages from ${registry}.`)
