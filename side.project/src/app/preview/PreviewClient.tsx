'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { ScrapedData } from '@/lib/types/scraper'
import type { MockupConfig } from '@/lib/types/generator'
import { generateMockup } from '@/lib/generator'
import PhoneFrame from '@/components/preview/PhoneFrame'

interface ScanStep {
  label: string
  status: 'pending' | 'active' | 'done'
}

export default function PreviewClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const url = searchParams.get('url') || ''

  const [config, setConfig] = useState<MockupConfig | null>(null)
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null)
  const [activeScreen, setActiveScreen] = useState('splash')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [error, setError] = useState<string | null>(null)
  const [scanSteps, setScanSteps] = useState<ScanStep[]>([
    { label: 'Fetching website...', status: 'pending' },
    { label: 'Extracting brand colors...', status: 'pending' },
    { label: 'Finding logo & images...', status: 'pending' },
    { label: 'Analyzing navigation...', status: 'pending' },
    { label: 'Detecting industry...', status: 'pending' },
    { label: 'Building your app preview...', status: 'pending' },
  ])

  const animateSteps = useCallback(() => {
    const delays = [0, 800, 1600, 2400, 3200, 4000]
    delays.forEach((delay, i) => {
      setTimeout(() => {
        setScanSteps(prev => prev.map((step, j) => ({
          ...step,
          status: j < i ? 'done' : j === i ? 'active' : 'pending',
        })))
      }, delay)
    })
  }, [])

  useEffect(() => {
    if (!url) return

    const scrape = async () => {
      animateSteps()

      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to scan website')
        }

        const data: ScrapedData = await res.json()
        setScrapedData(data)

        // Mark all steps done
        setScanSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })))

        // Small delay for the final step animation
        await new Promise(r => setTimeout(r, 600))

        const mockup = generateMockup(data)
        setConfig(mockup)

        // Auto-advance splash after 3s
        setTimeout(() => {
          setActiveScreen('login')
          setTimeout(() => setActiveScreen('dashboard'), 2000)
        }, 3000)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    }

    scrape()
  }, [url, animateSteps])

  // Loading state
  if (!config && !error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}>
        <div style={{ maxWidth: 400, width: '100%', padding: 24 }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: '#fff', fontWeight: 700, fontSize: 24,
            }}>A</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
              Scanning Website
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#888', wordBreak: 'break-all' }}>{url}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scanSteps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: step.status === 'pending' ? 0.3 : 1,
                transition: 'opacity 0.4s',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: step.status === 'done' ? '#22c55e' : step.status === 'active' ? '#6366f1' : '#2a2a2a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.3s',
                }}>
                  {step.status === 'done' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : step.status === 'active' ? (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#fff', animation: 'scan-pulse 1s infinite',
                    }} />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#555' }} />
                  )}
                </div>
                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: step.status === 'active' ? 600 : 400,
                  color: step.status === 'active' ? '#fff' : '#aaa',
                }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: 'Inter, -apple-system, sans-serif',
        textAlign: 'center',
        padding: 24,
      }}>
        <div style={{ maxWidth: 400 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28,
          }}>!</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
            Couldn&apos;t scan this website
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#888', marginBottom: 24 }}>{error}</p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px', background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try Another URL
          </button>
        </div>
      </div>
    )
  }

  // Preview state
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fafafa',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid #2a2a2a',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', color: '#888',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}>A</div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>AppVision</span>
        </div>

        <div style={{ width: 60 }} />
      </div>

      {/* Info bar */}
      {scrapedData && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          padding: '10px 24px',
          borderBottom: '1px solid #1a1a1a',
          fontSize: '0.78rem',
          color: '#888',
          flexWrap: 'wrap',
        }}>
          <span>
            <strong style={{ color: '#fafafa' }}>{config!.brand.name}</strong>
          </span>
          <span>
            Industry: <strong style={{ color: '#fafafa', textTransform: 'capitalize' }}>{scrapedData.industry}</strong>
          </span>
          <span>
            Primary: <span style={{
              display: 'inline-block', width: 12, height: 12, borderRadius: 3,
              background: scrapedData.colors.primary, verticalAlign: 'middle', marginLeft: 4,
              border: '1px solid #333',
            }} />
          </span>
          {scrapedData.hasPWA && (
            <span style={{ color: '#22c55e' }}>PWA Detected</span>
          )}
        </div>
      )}

      {/* Controls + Phone */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 40px',
      }}>
        {/* Screen selector */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {config!.screens.map(screen => (
            <button
              key={screen.id}
              onClick={() => setActiveScreen(screen.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: `1.5px solid ${activeScreen === screen.id ? '#6366f1' : '#2a2a2a'}`,
                background: activeScreen === screen.id ? '#6366f1' : 'transparent',
                color: activeScreen === screen.id ? '#fff' : '#888',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {screen.label}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          background: '#141414',
          borderRadius: 8,
          padding: 3,
          border: '1px solid #2a2a2a',
        }}>
          {(['light', 'dark'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: theme === t ? '#2a2a2a' : 'transparent',
                color: theme === t ? '#fff' : '#666',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {t === 'light' ? '☀ Light' : '☾ Dark'}
            </button>
          ))}
        </div>

        {/* Phone Frame */}
        <PhoneFrame
          config={config!}
          activeScreen={activeScreen}
          theme={theme}
          onScreenChange={setActiveScreen}
        />

        {/* Extracted info */}
        {scrapedData && (
          <div style={{
            marginTop: 32,
            maxWidth: 500,
            width: '100%',
            padding: 20,
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 14,
          }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 12 }}>
              Extracted from {new URL(scrapedData.url).hostname}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
              <div>
                <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 4 }}>COLORS</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {scrapedData.colors.all.slice(0, 6).map((c, i) => (
                    <div key={i} style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: c, border: '1px solid #333',
                    }} title={c} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 4 }}>FONTS</div>
                <div style={{ color: '#ccc' }}>{scrapedData.fonts.heading || 'Default'}</div>
                {scrapedData.fonts.body && scrapedData.fonts.body !== scrapedData.fonts.heading && (
                  <div style={{ color: '#888' }}>{scrapedData.fonts.body}</div>
                )}
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 4 }}>NAVIGATION</div>
                <div style={{ color: '#ccc' }}>{scrapedData.navigation.length} items found</div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 4 }}>SOCIAL</div>
                <div style={{ color: '#ccc', textTransform: 'capitalize' }}>
                  {scrapedData.socialLinks.length > 0
                    ? scrapedData.socialLinks.map(s => s.platform).join(', ')
                    : 'None found'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
