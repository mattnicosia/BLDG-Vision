import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No auth header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: memberData } = await supabase.from('org_members').select('org_id').single()
    if (!memberData?.org_id) throw new Error('No org found')
    const orgId = memberData.org_id

    const body = await req.json()
    const { to_email, subject, body_html, architect_id, draft_id } = body

    if (!to_email || !subject || !body_html) {
      throw new Error('Missing required fields: to_email, subject, body_html')
    }

    // Get email settings
    const { data: emailSettings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('org_id', orgId)
      .single()

    if (!emailSettings?.from_email) {
      throw new Error('Email not configured. Set up your sender identity in Settings.')
    }

    // Compose full HTML with signature
    const signatureHtml = emailSettings.signature_html || ''
    const fullHtml = signatureHtml
      ? `${body_html}<br><br>${signatureHtml}`
      : body_html

    const fromFormatted = emailSettings.from_name
      ? `${emailSettings.from_name} <${emailSettings.from_email}>`
      : emailSettings.from_email

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromFormatted,
        to: [to_email],
        subject,
        html: fullHtml,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      throw new Error(resendData.message || `Resend API error: ${resendRes.status}`)
    }

    // Auto-log touchpoint
    if (architect_id) {
      await supabase.from('architect_touchpoints').insert({
        org_id: orgId,
        architect_id,
        type: 'email',
        notes: `Sent: ${subject}`,
        contacted_at: new Date().toISOString(),
      })

      // Update last contact date
      await supabase
        .from('architects')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', architect_id)
    }

    // Update draft if provided
    if (draft_id) {
      await supabase
        .from('ai_drafts')
        .update({ sent_at: new Date().toISOString(), outcome: 'sent' })
        .eq('id', draft_id)
    }

    return new Response(
      JSON.stringify({ success: true, resend_message_id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
