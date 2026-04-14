'use client'

interface StatusBarProps {
  theme: 'light' | 'dark'
  activeScreen: string
}

export default function StatusBar({ activeScreen }: StatusBarProps) {
  const isSplash = activeScreen === 'splash'

  return (
    <div className="status-bar" style={isSplash ? { color: '#fff' } : undefined}>
      <span>9:41</span>
      <div className="status-icons">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="1" y="14" width="4" height="8" rx="1" />
          <rect x="7" y="10" width="4" height="12" rx="1" />
          <rect x="13" y="6" width="4" height="16" rx="1" />
          <rect x="19" y="2" width="4" height="20" rx="1" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 28 14" fill="currentColor">
          <rect x="0" y="1" width="23" height="12" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
          <rect x="2" y="3" width="17" height="8" rx="1" />
          <rect x="24" y="4.5" width="3" height="5" rx="1" />
        </svg>
      </div>
    </div>
  )
}
