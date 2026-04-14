'use client'

interface SplashScreenProps {
  className: string
  brand: { name: string; tagline: string; logoUrl: string | null }
  onTap: () => void
}

export default function SplashScreen({ className, brand, onTap }: SplashScreenProps) {
  const initials = brand.name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className={className} onClick={onTap}>
      <div className="splash-logo">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt={brand.name} crossOrigin="anonymous" />
        ) : (
          <svg viewBox="0 0 80 80" fill="none">
            <rect width="80" height="80" rx="16" fill="rgba(255,255,255,0.15)" />
            <text x="40" y="48" textAnchor="middle" fill="white" fontSize="24" fontWeight="700" fontFamily="Inter, sans-serif">{initials}</text>
          </svg>
        )}
      </div>
      <div className="splash-name">{brand.name}</div>
      <div className="splash-tagline">{brand.tagline}</div>
      <div className="splash-dots">
        <span /><span /><span />
      </div>
      <div className="splash-version">v1.0.0</div>
    </div>
  )
}
