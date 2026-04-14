'use client'

import { ICONS } from '@/lib/utils/icons'

interface LoginScreenProps {
  className: string
  brand: { name: string; logoUrl: string | null }
  onLogin: () => void
}

export default function LoginScreen({ className, brand, onLogin }: LoginScreenProps) {
  const initials = brand.name.split(/\s+/).slice(0, 1).map(w => w[0]).join('').toUpperCase()

  return (
    <div className={className}>
      <div className="login-logo">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt={brand.name} crossOrigin="anonymous" />
        ) : (
          <svg viewBox="0 0 28 28" fill="none">
            <text x="14" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">{initials}</text>
          </svg>
        )}
      </div>
      <div className="login-title">Welcome Back</div>
      <div className="login-subtitle">Sign in to your {brand.name} account</div>

      <label className="form-label">Email</label>
      <input className="form-input" type="email" placeholder="you@example.com" readOnly />

      <label className="form-label">Password</label>
      <input className="form-input" type="password" placeholder="••••••••" readOnly />

      <div className="form-row">
        <label className="form-checkbox">
          <input type="checkbox" readOnly />
          <span>Remember me</span>
        </label>
        <a href="#">Forgot password?</a>
      </div>

      <button className="btn-primary" onClick={onLogin}>Sign In</button>

      <div className="login-divider">or continue with</div>

      <button className="btn-biometric">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: ICONS['face-id'] }}
        />
        Face ID / Biometric
      </button>

      <div className="login-footer">
        Don&apos;t have an account? <a href="#">Create one</a>
      </div>
    </div>
  )
}
