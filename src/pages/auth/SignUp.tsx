import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2 } from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function SignUp() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Failed to create account')
      setLoading(false)
      return
    }

    // 2. Create organization
    const slug = slugify(companyName) + '-' + Date.now().toString(36)
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug,
        plan: 'trial',
      })
      .select()
      .single()

    if (orgError || !orgData) {
      setError(orgError?.message ?? 'Failed to create organization')
      setLoading(false)
      return
    }

    // 3. Create org membership
    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: orgData.id,
      user_id: authData.user.id,
      role: 'principal',
    })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    // 4. Create empty company profile (onboarding will fill it in)
    await supabase.from('company_profiles').insert({
      org_id: orgData.id,
      differentiators: [],
      core_values: [],
    })

    navigate('/onboarding')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1C1C1C]">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#06B6D4' }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-medium">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Set up your firm on BLDG Vision
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="fullName">
              Your name
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Matt Nicosia"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="companyName">
              Company name
            </label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Montana Home Builders"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#EF4444' }}>
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Get started'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
