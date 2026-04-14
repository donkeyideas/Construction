'use client'

import type { ScreenSection, MenuItem } from '@/lib/types/generator'
import { ICONS } from '@/lib/utils/icons'

interface MoreScreenProps {
  className: string
  sections: ScreenSection[]
}

export default function MoreScreen({ className, sections }: MoreScreenProps) {
  const profile = sections.find(s => s.type === 'user-profile')
  const menuGrid = sections.find(s => s.type === 'menu-grid')
  const settingsList = sections.find(s => s.type === 'settings-list')

  return (
    <div className={className}>
      {/* User Card */}
      {profile && (
        <div className="more-user-card">
          <div className="avatar" style={{ width: 48, height: 48 }}>
            {profile.data.initials as string}
          </div>
          <div>
            <div className="more-user-name">{profile.data.name as string}</div>
            <div className="more-user-role">{profile.data.role as string}</div>
          </div>
          <div className="more-user-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS['chevron-right'] }} />
          </div>
        </div>
      )}

      {/* Features Grid */}
      {menuGrid && (
        <div className="features-grid">
          {(menuGrid.data.items as MenuItem[]).map((item, i) => (
            <div key={i} className="feature-item">
              <div className="feature-icon" style={{ background: `${item.color}15` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[item.icon] || ICONS.grid }} />
              </div>
              <span className="feature-label">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {settingsList && (
        <div className="settings-list">
          {(settingsList.data.items as { label: string; icon: string }[]).map((item, i) => (
            <div key={i} className="settings-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[item.icon] || ICONS.settings }} />
              <span>{item.label}</span>
              <div className="chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS['chevron-right'] }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn-signout">Sign Out</button>
    </div>
  )
}
