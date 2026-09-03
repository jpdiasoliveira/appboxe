/**
 * UP-507 — Revisão periódica de práticas proibidas.
 *
 * Verifica:
 * - service_role / SERVICE_ROLE no frontend (src) — nunca expor no browser
 * - prefixo VITE_ em secrets server-side
 * - tipagem `any` e escapes (@ts-ignore) em código de produto
 * - nomenclatura proibida (§10) em código e scripts
 *
 * Uso:
 *   node scripts/check-prohibited-practices.mjs
 *   cd frontend && npm run check:practices
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { createReporter } from './smoke/lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.supabase',
  'test-results',
  'playwright-report',
  'blob-report',
  'coverage',
])

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs)$/

const ANY_PATTERNS = [
  { id: 'type-any', re: /:\s*any\b/ },
  { id: 'as-any', re: /\bas\s+any\b/ },
  { id: 'generic-any', re: /<any>/ },
  { id: 'ts-ignore', re: /@ts-ignore\b/ },
  { id: 'ts-expect-error', re: /@ts-expect-error\b/ },
]

const FORBIDDEN_BRANDS = [
  { id: 'ktech', re: new RegExp(`\\b${'k'}${'tech'}\\b`, 'i') },
  { id: 'join-club', re: /join[\s-]?club|joinclub/i },
  { id: 'nex-next-club', re: /nex[\s-]?clube?|next[\s-]?club|nexclub|nextclub/i },
]

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path, out)
    } else if (CODE_EXT.test(entry)) {
      out.push(path)
    }
  }
  return out
}

function rel(path) {
  return relative(root, path).replace(/\\/g, '/')
}

function scanLines(filePath, patterns) {
  const content = readFileSync(filePath, 'utf8')
  const hits = []
  content.split(/\r?\n/).forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.re.test(line)) {
        hits.push({
          pattern: pattern.id,
          line: index + 1,
          text: line.trim().slice(0, 140),
        })
      }
    }
  })
  return hits
}

function checkServiceRoleInFrontendSrc(r) {
  r.section('Frontend src — sem service_role')
  const files = walk(join(root, 'frontend/src'))
  let violations = 0

  for (const file of files) {
    const hits = scanLines(file, [
      { id: 'service_role', re: /service_role/i },
      { id: 'SERVICE_ROLE', re: /SERVICE_ROLE/ },
    ])
    if (hits.length > 0) {
      violations += hits.length
      for (const hit of hits) {
        r.fail(`${rel(file)}:${hit.line} — ${hit.text}`)
      }
    }
  }

  if (violations === 0) {
    r.ok('nenhuma referência a service_role em frontend/src')
  }
}

function checkViteServiceSecrets(r) {
  r.section('Frontend — sem VITE_*SERVICE*')
  const dirs = ['frontend/src', 'frontend/e2e', 'frontend']
  let violations = 0

  for (const dir of dirs) {
    const base = join(root, dir)
    for (const file of walk(base)) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.env.example')) continue
      const hits = scanLines(file, [{ id: 'vite-service', re: /VITE_.*SERVICE/i }])
      if (hits.length > 0) {
        violations += hits.length
        for (const hit of hits) {
          r.fail(`${rel(file)}:${hit.line} — secret server-side não pode usar prefixo VITE_`)
        }
      }
    }
  }

  if (violations === 0) {
    r.ok('nenhum VITE_*SERVICE* no frontend')
  }
}

function checkExplicitAny(r) {
  r.section('Tipagem — sem any / @ts-ignore em código de produto')
  const dirs = ['frontend/src', 'supabase/functions']
  let violations = 0

  for (const dir of dirs) {
    for (const file of walk(join(root, dir))) {
      const hits = scanLines(file, ANY_PATTERNS)
      if (hits.length > 0) {
        violations += hits.length
        for (const hit of hits) {
          r.fail(`${rel(file)}:${hit.line} [${hit.pattern}] — ${hit.text}`)
        }
      }
    }
  }

  if (violations === 0) {
    r.ok('frontend/src e supabase/functions sem any ou @ts-ignore')
  }
}

function checkForbiddenBrands(r) {
  r.section('Nomenclatura §10 — sem marcas proibidas em código')
  const dirs = ['frontend/src', 'frontend/e2e', 'supabase/functions', 'scripts']
  let violations = 0

  for (const dir of dirs) {
    for (const file of walk(join(root, dir))) {
      const fileRel = rel(file)
      if (fileRel === 'scripts/check-prohibited-practices.mjs') continue

      const hits = scanLines(file, FORBIDDEN_BRANDS)
      if (hits.length > 0) {
        violations += hits.length
        for (const hit of hits) {
          r.fail(`${rel(file)}:${hit.line} [${hit.pattern}] — ${hit.text}`)
        }
      }
    }
  }

  if (violations === 0) {
    r.ok('código e scripts sem KTech / Join Club / Nex Club')
  }
}

function main() {
  const r = createReporter()
  console.log('RingPro — check práticas proibidas (UP-507)\n')

  try {
    checkServiceRoleInFrontendSrc(r)
    checkViteServiceSecrets(r)
    checkExplicitAny(r)
    checkForbiddenBrands(r)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }

  const ok = r.summary()
  if (!ok) {
    console.log('\n❌ Violações encontradas — ver padrões/03-Praticas-Proibidas.md §10')
    process.exit(1)
  }

  console.log('\n✅ UP-507 passou — práticas proibidas OK.')
}

main()
