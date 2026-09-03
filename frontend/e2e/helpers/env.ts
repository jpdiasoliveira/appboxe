import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../../..')

export interface E2eEnv {
  url: string
  anonKey: string
  serviceKey: string | null
}

export function loadE2eEnv(): E2eEnv {
  try {
    const content = readFileSync(resolve(root, '.env'), 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([^#=]+)=(.*)$/)
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim()
      }
    }
  } catch {
    // ignore
  }

  return {
    url: process.env.VITE_SUPABASE_URL ?? '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  }
}

export function requireE2eEnv(): E2eEnv {
  const env = loadE2eEnv()
  if (!env.url || !env.anonKey) {
    throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env da raiz')
  }
  return env
}
