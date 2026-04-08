import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2 } from 'lucide-react'

export function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    navigate('/crm')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1C1C1C]">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#0F6E56' }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-medium">Sign in to BLDG Vision</h1>
          <p className="text-sm text-muted-foreground">
            Architect relationship intelligence for premium GCs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              placeholder="Your password"
              required
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#A32D2D' }}>
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <Link to="/sign-up" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
