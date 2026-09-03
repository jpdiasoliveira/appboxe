import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_FEATURE_FLAGS } from '../lib/platform-constants'

function defaultEnabledForFlag(flagKey: string): boolean {
  return DEFAULT_FEATURE_FLAGS.find((f) => f.key === flagKey)?.defaultEnabled ?? true
}

export function useFeatureFlag(
  academyId: string | null,
  flagKey: string,
): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(() => defaultEnabledForFlag(flagKey))
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!academyId) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('academy_feature_flags')
      .select('enabled')
      .eq('academy_id', academyId)
      .eq('flag_key', flagKey)
      .maybeSingle()
    setEnabled(data?.enabled ?? defaultEnabledForFlag(flagKey))
    setLoading(false)
  }, [academyId, flagKey])

  useEffect(() => {
    void load()
  }, [load])

  return { enabled, loading }
}
