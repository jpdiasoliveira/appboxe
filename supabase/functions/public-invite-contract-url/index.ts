import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {}
    const token = typeof body.token === 'string' ? body.token : new URL(req.url).searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: contractInfo, error: rpcError } = await admin.rpc('get_invite_contract_for_token', {
      p_token: token,
    })

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const info = contractInfo as Record<string, unknown>
    if (!info?.ok || typeof info.file_path !== 'string') {
      return new Response(JSON.stringify({ error: 'Contrato indisponível para este convite' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiresIn = 3600
    const { data: signed, error: signError } = await admin.storage
      .from('academy-documents')
      .createSignedUrl(info.file_path as string, expiresIn)

    if (signError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: signError?.message ?? 'Falha ao gerar link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        signedUrl: signed.signedUrl,
        title: info.title,
        original_filename: info.original_filename,
        expiresIn,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
