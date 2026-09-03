/**
 * @deprecated Use scripts/smoke-academy-portal.mjs
 * Mantido por compatibilidade — delega para o smoke completo.
 */
import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const script = resolve(__dirname, 'smoke-academy-portal.mjs')
const result = spawnSync(process.execPath, [script], { stdio: 'inherit', shell: false })
process.exit(result.status ?? 1)
