import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export function ProcoreCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'exchanging' | 'selecting' | 'success' | 'error'>('exchanging')
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setStatus('error')
      setError('No authorization code received from Procore')
      return
    }
    exchangeCode(code)
  }, [searchParams])

  async function exchangeCode(code: string) {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Exchange the code for tokens
      const res = await fetch(`${supabaseUrl}/functions/v1/procore-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'exchange_code', code }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Now get companies to let user pick theirs
      const compRes = await fetch(`${supabaseUrl}/functions/v1/procore-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'get_companies' }),
      })

      const compData = await compRes.json()
      if (compData.companies && compData.companies.length > 0) {
        if (compData.companies.length === 1) {
          // Auto-select if only one company
          await selectCompany(compData.companies[0].id)
        } else {
          setCompanies(compData.companies)
          setStatus('selecting')
        }
      } else {
        setStatus('success')
        toast.success('Procore connected!')
        setTimeout(() => navigate('/settings'), 2000)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  async function selectCompany(companyId: number) {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      await fetch(`${supabaseUrl}/functions/v1/procore-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'set_company', company_id: companyId }),
      })

      setStatus('success')
      toast.success('Procore connected!')
      setTimeout(() => navigate('/settings'), 2000)
    } catch (err) {
      setStatus('error')
      setError('Failed to set company')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: '#141414' }}>
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', maxWidth: 400 }}>
        {status === 'exchanging' && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: '#6366F1' }} />
            <p className="mt-4 text-[15px] font-medium" style={{ color: '#E8E8F0' }}>Connecting to Procore...</p>
            <p className="mt-1 text-[13px]" style={{ color: '#7C7C7C' }}>Exchanging authorization</p>
          </>
        )}

        {status === 'selecting' && (
          <>
            <p className="text-[15px] font-medium" style={{ color: '#E8E8F0' }}>Select your Procore company</p>
            <div className="mt-4 flex flex-col gap-2">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c.id)}
                  className="nav-item rounded-lg p-3 text-left text-[13px] font-medium"
                  style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', color: '#E8E8F0' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-8 w-8" style={{ color: '#22C55E' }} />
            <p className="mt-4 text-[15px] font-medium" style={{ color: '#E8E8F0' }}>Procore connected!</p>
            <p className="mt-1 text-[13px]" style={{ color: '#7C7C7C' }}>Redirecting to Settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-8 w-8" style={{ color: '#EF4444' }} />
            <p className="mt-4 text-[15px] font-medium" style={{ color: '#E8E8F0' }}>Connection failed</p>
            <p className="mt-1 text-[13px]" style={{ color: '#EF4444' }}>{error}</p>
            <button
              onClick={() => navigate('/settings')}
              className="mt-4 text-[13px] font-medium"
              style={{ color: '#6366F1' }}
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  )
}
