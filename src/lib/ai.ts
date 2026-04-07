// src/lib/ai.ts
// Client-side helpers for calling the ai-generate Supabase Edge Function
// Never call Anthropic directly from the client — always go through this

import { supabase } from './supabase'
import type { AIDraftMode } from '@/types'

interface GenerateOptions {
  mode: AIDraftMode
  architectId?: string
  signalId?: string
  projectId?: string
  veId?: string
  emailSeriesTopic?: string
  emailSeriesType?: string
}

interface GenerateResult {
  text: string
  error?: string
}

export async function generateAI(options: GenerateOptions): Promise<GenerateResult> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: options,
    })

    if (error) {
      console.error('AI generation error:', error)
      return { text: '', error: error.message }
    }

    return { text: data?.text ?? '' }
  } catch (err) {
    console.error('AI generation failed:', err)
    return { text: '', error: 'Failed to connect to AI service. Try again.' }
  }
}

// Convenience wrappers
export const generateOutreach = (architectId: string) =>
  generateAI({ mode: 'outreach', architectId })

export const generateBrief = (architectId: string) =>
  generateAI({ mode: 'brief', architectId })

export const generateSignalResponse = (architectId: string, signalId: string) =>
  generateAI({ mode: 'signal_response', architectId, signalId })

export const generateShowcase = (projectId: string) =>
  generateAI({ mode: 'showcase', projectId })

export const generateEmailSeries = (type: string, topic: string) =>
  generateAI({ mode: 'email_series', emailSeriesType: type, emailSeriesTopic: topic })

// Email sending
interface SendEmailOptions {
  to_email: string
  subject: string
  body_html: string
  architect_id?: string
  draft_id?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(options),
    })

    const data = await res.json()
    if (data.error) return { success: false, error: data.error }
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to send email. Check your connection.' }
  }
}

// Draft persistence
export async function saveDraft(params: {
  architect_id?: string
  type: string
  subject?: string
  body: string
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_drafts')
    .insert({
      ...params,
      model: 'claude-sonnet-4-20250514',
    })
    .select('id')
    .single()
  return error ? null : data.id
}

export async function updateDraftOutcome(draftId: string, outcome: string, editedBody?: string) {
  await supabase
    .from('ai_drafts')
    .update({ outcome, edited_body: editedBody })
    .eq('id', draftId)
}
