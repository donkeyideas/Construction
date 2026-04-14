'use client'

import type { TabItem } from '@/lib/types/generator'
import { ICONS } from '@/lib/utils/icons'

interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => {
        const isActive = tab.screenId === activeTab || tab.id === activeTab
        return (
          <div
            key={tab.id}
            className={`tab-item${isActive ? ' active' : ''}`}
            onClick={() => onTabChange(tab.screenId)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: ICONS[tab.icon] || ICONS.grid }}
            />
            <span className="tab-label">{tab.label}</span>
          </div>
        )
      })}
    </div>
  )
}
