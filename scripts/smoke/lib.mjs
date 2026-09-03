import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const root = resolve(__dirname, '../..')

export const ACADEMY_ID = 'a0000000-0000-4000-8000-000000000001'
export const PASSWORD = 'RingPro@dev123'

export const USERS = {
  professor: 'professor@academia-teste.dev',
  owner: 'owner@academia-teste.dev',
  assistant: 'assistant@academia-teste.dev',
  student: 'aluno@academia-teste.dev',
}

export function loadEnv() {
  const path = resolve(root, '.env')
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

export function createSupabaseClients(env) {
  const require = createRequire(resolve(root, 'frontend/package.json'))
  const { createClient } = require('@supabase/supabase-js')
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey) {
    throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env da raiz')
  }
  const anon = () =>
    createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  const admin = serviceKey
    ? createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null
  return { url, anon, admin }
}

export function createReporter() {
  const results = []
  return {
    results,
    section(title) {
      console.log(`\n▶ ${title}`)
    },
    ok(message) {
      results.push({ ok: true, message })
      console.log(`  OK: ${message}`)
    },
    fail(message) {
      results.push({ ok: false, message })
      console.log(`  FAIL: ${message}`)
      throw new Error(message)
    },
    assert(condition, message) {
      if (condition) this.ok(message)
      else this.fail(message)
    },
    summary() {
      const passed = results.filter((r) => r.ok).length
      console.log(`\n${'─'.repeat(50)}`)
      console.log(`Resultado: ${passed}/${results.length} checks passaram`)
      return passed === results.length
    },
  }
}

export async function signIn(client, email) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (error) throw new Error(`Login ${email}: ${error.message}`)
  return data.user
}

export async function countStudents(client, academyId, status) {
  let q = client
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId)
  if (status) q = q.eq('status', status)
  const { count, error } = await q
  if (error) throw new Error(`count students: ${error.message}`)
  return count ?? 0
}

export async function fetchKpis(client, academyId) {
  const today = new Date().toISOString().slice(0, 10)
  const [ativos, inadimplentes, presencasHoje] = await Promise.all([
    countStudents(client, academyId, 'ATIVO'),
    countStudents(client, academyId, 'INADIMPLENTE'),
    client
      .from('attendance_records')
      .select('training_category_id', { count: 'exact', head: true })
      .eq('academy_id', academyId)
      .eq('class_date', today)
      .then(({ count, error }) => {
        if (error) throw new Error(`presenças hoje: ${error.message}`)
        return count ?? 0
      }),
  ])
  return { alunosAtivos: ativos, inadimplencia: inadimplentes, turmasHoje: presencasHoje }
}

export async function countAttendanceEligible(client, academyId) {
  const { count, error } = await client
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .in('status', ['ATIVO', 'TRIAL'])
  if (error) throw new Error(`attendance students: ${error.message}`)
  return count ?? 0
}
