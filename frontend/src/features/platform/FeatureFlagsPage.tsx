import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DEFAULT_FEATURE_FLAGS } from '../../lib/platform-constants'
import { fetchFeatureFlags, updateFeatureFlag } from './platform-api'
import { Card } from '../../components/ui/Card'

export function FeatureFlagsPage() {
  const { academyId } = useParams<{ academyId: string }>()
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!academyId) return
    fetchFeatureFlags(academyId).then((rows) => {
      const map: Record<string, boolean> = {}
      for (const f of DEFAULT_FEATURE_FLAGS) {
        const row = rows.find((r) => r.flag_key === f.key)
        map[f.key] = row?.enabled ?? f.defaultEnabled
      }
      setFlags(map)
    })
  }, [academyId])

  async function toggle(key: string) {
    if (!academyId) return
    const next = !flags[key]
    setFlags((prev) => ({ ...prev, [key]: next }))
    setSaving(key)
    try {
      await updateFeatureFlag(academyId, key, next)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="mb-6 text-2xl font-semibold">Feature flags</h2>
      <Card className="space-y-4">
        {DEFAULT_FEATURE_FLAGS.map((f) => (
          <label
            key={f.key}
            className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3 last:border-0"
          >
            <div>
              <p className="font-medium">{f.label}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{f.key}</p>
            </div>
            <input
              type="checkbox"
              checked={flags[f.key] ?? f.defaultEnabled}
              disabled={saving === f.key}
              onChange={() => void toggle(f.key)}
              className="h-5 w-5"
            />
          </label>
        ))}
      </Card>
    </div>
  )
}
