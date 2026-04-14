'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    router.push(`/preview?url=${encodeURIComponent(url.trim())}`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--av-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16,
          }}>A</div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>AppVision</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--av-muted)' }}>
          Free &bull; No Signup Required
        </div>
      </header>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: 999,
          border: '1px solid var(--av-border)',
          fontSize: '0.8rem',
          color: 'var(--av-muted)',
          marginBottom: 24,
        }}>
          Powered by AI &bull; 12 Industry Templates
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          maxWidth: 700,
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}>
          See Your Website as a{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Mobile App
          </span>
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: 'var(--av-muted)',
          maxWidth: 520,
          lineHeight: 1.6,
          marginBottom: 40,
        }}>
          Enter any website URL and watch it transform into an interactive mobile app preview.
          See your brand colors, navigation, and content — instantly.
        </p>

        {/* URL Input */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: 8,
          width: '100%',
          maxWidth: 560,
          marginBottom: 48,
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            background: 'var(--av-surface)',
            border: '1px solid var(--av-border)',
            borderRadius: 12,
            transition: 'border-color 0.2s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--av-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., stripe.com)"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.95rem',
                color: 'var(--av-text)',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 28px',
              background: loading
                ? 'var(--av-border)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Loading...' : 'Generate Preview'}
          </button>
        </form>

        {/* How It Works */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 24,
          width: '100%',
          maxWidth: 700,
          marginBottom: 48,
        }}>
          {[
            { step: '1', title: 'Enter URL', desc: 'Paste any website URL' },
            { step: '2', title: 'AI Scans', desc: 'Colors, logo, navigation extracted' },
            { step: '3', title: 'Preview', desc: 'Interactive mobile app mockup' },
          ].map(item => (
            <div key={item.step} style={{
              padding: 24,
              background: 'var(--av-surface)',
              border: '1px solid var(--av-border)',
              borderRadius: 16,
              textAlign: 'center',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--av-accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, margin: '0 auto 12px',
              }}>
                {item.step}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--av-muted)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          maxWidth: 600,
        }}>
          {[
            '7 Interactive Screens',
            'Light & Dark Theme',
            '12 Industry Templates',
            'Brand Color Extraction',
            'Navigation Mapping',
            'Fully Free',
          ].map(feature => (
            <span key={feature} style={{
              padding: '8px 16px',
              background: 'var(--av-card)',
              border: '1px solid var(--av-border)',
              borderRadius: 999,
              fontSize: '0.82rem',
              color: 'var(--av-muted)',
            }}>
              {feature}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '20px 32px',
        borderTop: '1px solid var(--av-border)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--av-muted)',
      }}>
        AppVision &copy; {new Date().getFullYear()} &bull; Visualize your website as a mobile app
      </footer>
    </div>
  )
}
