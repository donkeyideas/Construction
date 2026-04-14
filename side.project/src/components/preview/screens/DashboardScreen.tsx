'use client'

import type { ScreenSection, KPIItem, QuickActionItem, ListItem } from '@/lib/types/generator'
import { ICONS } from '@/lib/utils/icons'

interface DashboardScreenProps {
  className: string
  sections: ScreenSection[]
  brand: { name: string }
  onItemTap: () => void
}

export default function DashboardScreen({ className, sections, brand, onItemTap }: DashboardScreenProps) {
  const header = sections.find(s => s.type === 'header')
  const kpiRow = sections.find(s => s.type === 'kpi-row')
  const quickActions = sections.find(s => s.type === 'quick-actions')
  const cardList = sections.find(s => s.type === 'card-list')
  const activityFeed = sections.find(s => s.type === 'activity-feed')

  const initials = (header?.data.initials as string) || brand.name.slice(0, 2).toUpperCase()

  return (
    <div className={className}>
      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-greeting">{header?.data.greeting as string || 'Welcome back'}</div>
          <div className="dash-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        <div className="dash-header-right">
          <div className="notification-bell">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS.bell }} />
            <div className="notification-dot" />
          </div>
          <div className="avatar">{initials}</div>
        </div>
      </div>

      {/* KPI Row */}
      {kpiRow && (
        <div className="kpi-row">
          {(kpiRow.data.items as KPIItem[]).map((kpi, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-icon" style={{ background: `${kpi.color}15` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[kpi.icon] || ICONS.grid }} />
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions && (
        <div className="quick-actions">
          {(quickActions.data.items as QuickActionItem[]).map((action, i) => (
            <div key={i} className="quick-action">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[action.icon] || ICONS.grid }} />
              <span>{action.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Card List */}
      {cardList && (
        <div>
          <div className="section-header">
            <div className="section-title">{cardList.data.title as string}</div>
            <div className="section-link">{(cardList.data.linkText as string) || 'See All'}</div>
          </div>
          {(cardList.data.items as ListItem[]).map((item, i) => (
            <div key={i} className="item-card" onClick={onItemTap}>
              <div>
                <div className="item-name">{item.title}</div>
                <div className="item-meta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS.map }} />
                  {item.subtitle}
                </div>
              </div>
              {item.badge && (
                <span className={`item-badge badge-${item.badgeType || 'active'}`}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      {activityFeed && (
        <div style={{ marginTop: 16 }}>
          <div className="section-header">
            <div className="section-title">{activityFeed.data.title as string}</div>
          </div>
          {(activityFeed.data.items as { text: string; time: string; color: string }[]).map((item, i) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background: item.color }} />
              <div>
                <div className="activity-text">{item.text}</div>
                <div className="activity-time">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
