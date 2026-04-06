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
