'use client'

import type { ScreenSection } from '@/lib/types/generator'
import { ICONS } from '@/lib/utils/icons'

interface DetailScreenProps {
  className: string
  sections: ScreenSection[]
  onBack: () => void
}

export default function DetailScreen({ className, sections, onBack }: DetailScreenProps) {
  const hero = sections.find(s => s.type === 'detail-hero')
  const stats = sections.find(s => s.type === 'detail-stats')
  const desc = sections.find(s => s.type === 'detail-description')
  const actions = sections.find(s => s.type === 'detail-actions')

  return (
    <div className={className}>
      {/* Back button */}
      <div className="detail-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS['chevron-left'] }} />
      </div>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-hero-overlay" />
        <div className="detail-hero-content">
          <div className="detail-hero-title">{(hero?.data.title as string) || 'Details'}</div>
          <div className="detail-hero-subtitle">{(hero?.data.subtitle as string) || ''}</div>
        </div>
      </div>

      <div className="detail-body">
        {/* Stats */}
        {stats && (
          <div className="detail-stats">
            {(stats.data.stats as { label: string; value: string }[]).map((stat, i) => (
              <div key={i} className="detail-stat">
                <div className="detail-stat-value">{stat.value}</div>
                <div className="detail-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {desc && (
          <div className="detail-section">
            <div className="detail-section-title">{(desc.data.title as string) || 'Description'}</div>
            <div className="detail-description">{desc.data.text as string}</div>
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="detail-actions">
            <button style={{ background: 'var(--blue)', color: '#fff' }}>
              {(actions.data.primary as { label: string })?.label || 'Action'}
            </button>
            <button style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              {(actions.data.secondary as { label: string })?.label || 'Share'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
