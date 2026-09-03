import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, UserAcademyRole } from '../lib/types'
import { getRedirectForRole, pickPrimaryRole } from '../lib/auth-utils'
import type { UserRole } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: UserAcademyRole[]
  primaryRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; redirect?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  return data as Profile | null
}

async function fetchRoles(userId: string): Promise<UserAcademyRole[]> {
  const { data, error } = await supabase
    .from('user_academy_roles')
    .select('*, academy:academies(*)')
    .eq('user_id', userId)
    .eq('status', 'ATIVO')
  if (error) return []
  return (data ?? []) as UserAcademyRole[]
}

function isStaffBlockedBySuspension(roles: UserAcademyRole[]): boolean {
  const withAcademy = roles.filter(
    (r) => r.academy_id && r.role !== 'PLATFORM_OWNER' && r.academy,
  )
  if (withAcademy.length === 0) return false
  return withAcademy.every((r) => r.academy?.status === 'SUSPENSO')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<UserAcademyRole[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async (userId: string) => {
    const [p, r] = await Promise.all([fetchProfile(userId), fetchRoles(userId)])
    setProfile(p)
    setRoles(r)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await loadUserData(user.id)
  }, [user?.id, loadUserData])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadUserData(s.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadUserData(s.user.id)
      } else {
        setProfile(null)
        setRoles([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserData])

  const primaryRole = useMemo(() => pickPrimaryRole(roles), [roles])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }

      const u = data.user
      if (!u?.email_confirmed_at) {
        await supabase.auth.signOut()
        return { error: 'Confirme seu e-mail antes de entrar.' }
      }

      const [p, r] = await Promise.all([fetchProfile(u.id), fetchRoles(u.id)])
      setProfile(p)
      setRoles(r)

      if (p?.must_change_password) {
        return { error: null, redirect: '/auth/trocar-senha' }
      }

      const role = pickPrimaryRole(r)
      if (!role) return { error: 'Usuário sem permissão no sistema.' }

      if (role !== 'PLATFORM_OWNER' && isStaffBlockedBySuspension(r)) {
        await supabase.auth.signOut()
        return {
          error: 'Academia suspensa por inadimplência na plataforma. Contate o suporte.',
        }
      }

      await supabase.from('audit_logs').insert({
        user_id: u.id,
        action: 'LOGIN',
        entity_type: 'session',
        metadata: { email },
      })

      return { error: null, redirect: getRedirectForRole(role) }
    },
    [],
  )

  const signOut = useCallback(async () => {
    const uid = user?.id
    if (uid) {
      await supabase.from('audit_logs').insert({
        user_id: uid,
        action: 'LOGOUT',
        entity_type: 'session',
        metadata: {},
      })
    }
    await supabase.auth.signOut()
    setProfile(null)
    setRoles([])
  }, [user?.id])

  const value: AuthContextValue = {
    session,
    user,
    profile,
    roles,
    primaryRole,
    loading,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
