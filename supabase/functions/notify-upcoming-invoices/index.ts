import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {

  dispatchInvoicePushMessages,

  type InvoicePushRpcMessage,

} from '../_shared/push/dispatch.ts'



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',

}



Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {

    return new Response('ok', { headers: corsHeaders })

  }



  try {

    const cronSecret = Deno.env.get('CRON_SECRET')

    const authHeader = req.headers.get('Authorization')

    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`



    if (!isCron) {

      const supabaseUser = createClient(

        Deno.env.get('SUPABASE_URL') ?? '',

        Deno.env.get('SUPABASE_ANON_KEY') ?? '',

        { global: { headers: { Authorization: authHeader ?? '' } } },

      )

      const {

        data: { user },

      } = await supabaseUser.auth.getUser()

      const { data: isOwner } = await supabaseUser.rpc('is_platform_owner')

      if (!user || !isOwner) {

        return new Response(JSON.stringify({ error: 'Não autorizado' }), {

          status: 401,

          headers: { ...corsHeaders, 'Content-Type': 'application/json' },

        })

      }

    }



    const admin = createClient(

      Deno.env.get('SUPABASE_URL') ?? '',

      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',

    )



    const { data, error } = await admin.rpc('notify_upcoming_academy_invoices')

    if (error) {

      return new Response(JSON.stringify({ error: error.message }), {

        status: 500,

        headers: { ...corsHeaders, 'Content-Type': 'application/json' },

      })

    }



    const rpcResult = (data ?? {}) as Record<string, unknown>

    const pushMessages = (rpcResult.push_messages ?? []) as InvoicePushRpcMessage[]

    let pushSent = 0

    let pushSkippedAcademies = 0



    try {

      const pushResult = await dispatchInvoicePushMessages(admin, pushMessages)

      pushSent = pushResult.sent

      pushSkippedAcademies = pushResult.skippedAcademies

    } catch (pushError) {

      console.error('[notify-upcoming-invoices] push falhou:', pushError)

    }



    return new Response(

      JSON.stringify({

        ok: true,

        ...rpcResult,

        push_sent: pushSent,

        push_skipped_academies: pushSkippedAcademies,

        push_configured: Boolean(Deno.env.get('FCM_SERVER_KEY')),

      }),

      {

        headers: { ...corsHeaders, 'Content-Type': 'application/json' },

      },

    )

  } catch (e) {

    return new Response(JSON.stringify({ error: String(e) }), {

      status: 500,

      headers: { ...corsHeaders, 'Content-Type': 'application/json' },

    })

  }

})

