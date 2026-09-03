/**

 * Aplica migrations RingPro no Supabase remoto + seed opcional.

 *

 * Pré-requisitos:

 *   1. npx supabase login

 *   2. .env na raiz com VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY

 *   3. Senha do banco em SUPABASE_DB_PASSWORD (Dashboard → Settings → Database)

 *      Ou SUPABASE_DB_URL com a URI copiada do Dashboard (Connect → Session pooler)

 *

 * Uso:

 *   node scripts/apply-db-remote.mjs

 *   node scripts/apply-db-remote.mjs --seed

 *

 * Windows: use `npx.cmd` no terminal se `npx` falhar por ExecutionPolicy do PowerShell.

 */

import { spawnSync } from 'child_process'

import { readFileSync, existsSync } from 'fs'

import { resolve, dirname } from 'path'

import { fileURLToPath } from 'url'



const __dirname = dirname(fileURLToPath(import.meta.url))

const root = resolve(__dirname, '..')

const projectRef = 'iqqmcvrwysoqoondbnbh'

const withSeed = process.argv.includes('--seed')

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const node = process.execPath



function loadEnv() {

  const path = resolve(root, '.env')

  const env = {}

  if (!existsSync(path)) return env



  let raw = readFileSync(path, 'utf8')

  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)



  for (const line of raw.split(/\r?\n/)) {

    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')

    if (eq <= 0) continue

    const key = trimmed.slice(0, eq).trim()

    let value = trimmed.slice(eq + 1).trim()

    if (

      (value.startsWith('"') && value.endsWith('"')) ||

      (value.startsWith("'") && value.endsWith("'"))

    ) {

      value = value.slice(1, -1)

    }

    env[key] = value

  }



  for (const key of ['SUPABASE_DB_PASSWORD', 'SUPABASE_DB_URL', 'SUPABASE_DB_REGION']) {

    if (process.env[key]) env[key] = process.env[key]

  }

  return env

}



function quoteCmdArg(arg) {

  const s = String(arg)

  if (/[\s"&|<>^]/.test(s)) {

    return `"${s.replace(/"/g, '""')}"`

  }

  return s

}



/**

 * Executa `npx supabase …`.

 * No Windows, Node não pode spawnar `.cmd` diretamente (EINVAL) — usa cmd.exe /c.

 */

function runSupabase(args, options = {}) {

  const fullArgs = ['supabase', ...args]

  let result



  if (process.platform === 'win32') {

    const cmdLine = [npx, ...fullArgs].map(quoteCmdArg).join(' ')

    result = spawnSync('cmd.exe', ['/d', '/s', '/c', cmdLine], {

      cwd: root,

      stdio: 'inherit',

      shell: false,

      env: { ...process.env, ...options.env },

    })

  } else {

    result = spawnSync('npx', fullArgs, {

      cwd: root,

      stdio: 'inherit',

      shell: false,

      env: { ...process.env, ...options.env },

    })

  }



  if (result.error) {

    console.error(`\nErro ao executar Supabase CLI: ${result.error.message}`)

    if (process.platform === 'win32') {

      console.error('Dica: rode `npx.cmd supabase login` no terminal e tente de novo.\n')

    }

    process.exit(1)

  }



  if (result.status !== 0) {

    process.exit(result.status ?? 1)

  }



  return result

}



const env = loadEnv()

const dbPassword = env.SUPABASE_DB_PASSWORD

const dbUrlOverride = env.SUPABASE_DB_URL

const dbRegion = env.SUPABASE_DB_REGION

const defaultRegions = [

  'sa-east-1',

  'us-east-1',

  'us-east-2',

  'us-west-1',

  'eu-west-1',

  'eu-central-1',

  'ap-southeast-1',

]

const poolerPrefixes = ['aws-0', 'aws-1']



function buildDbUrls(password) {

  const encoded = encodeURIComponent(password)

  const regions = dbRegion ? [dbRegion] : defaultRegions

  const urls = []

  urls.push(`postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`)

  for (const prefix of poolerPrefixes) {

    for (const region of regions) {

      urls.push(

        `postgresql://postgres.${projectRef}:${encoded}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,

      )

    }

  }

  return urls

}



console.log('RingPro — aplicar banco remoto\n')



if (!dbPassword && !dbUrlOverride) {

  console.log('SUPABASE_DB_PASSWORD não encontrada no .env')

  console.log('Tentando: npx supabase link + db push (requer supabase login)...\n')

  runSupabase(['link', '--project-ref', projectRef, '--yes'])

  runSupabase(['db', 'push', '--yes'])

} else {

  if (dbUrlOverride) {

    console.log('Usando SUPABASE_DB_URL do .env\n')

  } else {

    console.log('Usando SUPABASE_DB_PASSWORD do .env\n')

  }



  const urls = dbUrlOverride ? [dbUrlOverride] : buildDbUrls(dbPassword)

  let pushed = false

  for (const dbUrl of urls) {

    const label = dbUrl.includes('pooler') ? 'session pooler' : 'conexão direta'

    console.log(`Aplicando migrations via ${label}...\n`)



    let result

    if (process.platform === 'win32') {

      const cmdLine = [npx, 'supabase', 'db', 'push', '--db-url', dbUrl, '--yes']

        .map(quoteCmdArg)

        .join(' ')

      result = spawnSync('cmd.exe', ['/d', '/s', '/c', cmdLine], {

        cwd: root,

        stdio: 'inherit',

        shell: false,

        env: { ...process.env },

      })

    } else {

      result = spawnSync('npx', ['supabase', 'db', 'push', '--db-url', dbUrl, '--yes'], {

        cwd: root,

        stdio: 'inherit',

        shell: false,

        env: { ...process.env },

      })

    }



    if (result.error) {

      console.error(`\nErro: ${result.error.message}\n`)

      break

    }



    if (result.status === 0) {

      pushed = true

      break

    }

    console.log(`\nFalhou com ${label}, tentando próximo método...\n`)

  }



  if (!pushed) {

    console.error(

      '\nNão foi possível conectar. Tente:\n' +

        '  1. Copiar a URI em Dashboard → Connect → Session pooler → SUPABASE_DB_URL no .env\n' +

        '  2. Ou: npx.cmd supabase login && npx.cmd supabase link --project-ref ' +

        projectRef +

        ' -p SUA_SENHA --yes && npx.cmd supabase db push --yes\n',

    )

    process.exit(1)

  }

}



console.log('\nDeploy das Edge Functions (últimas)...\n')

console.log('(Requer `npx.cmd supabase login` no Windows — pule se já fez deploy manualmente)\n')

const functions = [

  'create-student-invite',

  'resend-student-invite',

  'complete-student-invite',

  'send-student-invite-email',

  'create-staff-invite',

  'complete-staff-invite',

  'create-platform-staff-invite',

  'complete-platform-staff-invite',

  'public-student-register',

  'create-student',

  'create-academy-with-owner',

  'apply-dunning',

  'notify-upcoming-invoices',

  'register-push-token',

  'notify-physical-assessment-due',

  'public-invite-contract-url',

  'simulate-payment',

  'create-payment-charge',

  'charge-recurring-invoices',

  'pagarme-webhook',

]

for (const fn of functions) {

  console.log(`→ ${fn}`)

  let result

  if (process.platform === 'win32') {

    const cmdLine = [npx, 'supabase', 'functions', 'deploy', fn, '--project-ref', projectRef]

      .map(quoteCmdArg)

      .join(' ')

    result = spawnSync('cmd.exe', ['/d', '/s', '/c', cmdLine], {

      cwd: root,

      stdio: 'inherit',

      shell: false,

      env: { ...process.env },

    })

  } else {

    result = spawnSync('npx', ['supabase', 'functions', 'deploy', fn, '--project-ref', projectRef], {

      cwd: root,

      stdio: 'inherit',

      shell: false,

      env: { ...process.env },

    })

  }



  if (result.error || result.status !== 0) {

    console.log('\nDeploy interrompido — faça login: npx.cmd supabase login\n')

    break

  }

}



if (withSeed) {

  console.log('\nSeed de desenvolvimento...\n')

  const seedScript = resolve(root, 'scripts/seed-dev-users.mjs')

  const seedResult = spawnSync(node, [seedScript], {

    cwd: resolve(root, 'frontend'),

    stdio: 'inherit',

    shell: false,

    env: { ...process.env },

  })

  if (seedResult.status !== 0) {

    console.log(

      '\nSeed falhou — rode manualmente:\n' +

        '  cd frontend\n' +

        `  node "${seedScript}"\n`,

    )

  }

}



console.log('\nConcluído.')


