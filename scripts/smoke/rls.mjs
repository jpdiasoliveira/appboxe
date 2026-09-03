/** UUID de academia inexistente — isolamento multi-tenant nos smokes RLS. */
export const FOREIGN_ACADEMY_ID = 'b0000000-0000-4000-8000-000000000099'

export async function assertNoFinanceAccess(r, client, label, academyId) {
  const { data: invoices } = await client
    .from('academy_invoices')
    .select('id')
    .eq('academy_id', academyId)
    .limit(5)
  r.assert((invoices ?? []).length === 0, `${label} não lê academy_invoices`)

  const { data: payments } = await client
    .from('academy_payments')
    .select('id')
    .limit(5)
  r.assert((payments ?? []).length === 0, `${label} não lê academy_payments`)

  const { data: canFin } = await client.rpc('can_view_academy_finance', {
    p_academy_id: academyId,
  })
  r.assert(canFin === false, `${label} can_view_academy_finance = false`)
}

export async function assertTenantIsolationRead(r, client, label, table, academyIdColumn, foreignAcademyId) {
  const { data, error } = await client
    .from(table)
    .select('id')
    .eq(academyIdColumn, foreignAcademyId)
    .limit(5)

  r.assert(!error, `${label} consulta ${table} (outro tenant) sem erro SQL`)
  r.assert((data ?? []).length === 0, `${label} não vê ${table} de outra academia`)
}

export async function assertInsertDenied(r, client, label, table, row) {
  const { error } = await client.from(table).insert(row)
  r.assert(!!error, `${label} INSERT ${table} negado por RLS`)
}

export async function assertRpcDenied(r, client, label, fn, args) {
  const { error } = await client.rpc(fn, args)
  r.assert(!!error, `${label} RPC ${fn} negado`)
}
