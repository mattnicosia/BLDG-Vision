import { useOrg } from '@/hooks/useOrg'
import { useAuth } from '@/hooks/useAuth'

export function SettingsIndex() {
  const { org } = useOrg()
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Settings</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-3 text-base font-medium">Organization</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm">{org?.name ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm capitalize">{org?.plan ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Region</p>
              <p className="text-sm">{org?.region ?? 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget range</p>
              <p className="text-sm">
                ${((org?.budget_min ?? 0) / 1000000).toFixed(1)}M -
                ${((org?.budget_max ?? 0) / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-3 text-base font-medium">Account</h2>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">{user?.email ?? 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
