import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--color-bg)] to-[#1a0a0a] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden />
      <div className="relative z-10 w-full max-w-[420px]">
        <Outlet />
      </div>
    </div>
  )
}
