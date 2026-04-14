'use client'

import type { ScreenSection, ListItem } from '@/lib/types/generator'
import { ICONS } from '@/lib/utils/icons'

interface ListScreenProps {
  className: string
  sections: ScreenSection[]
  onItemTap: () => void
}

export default function ListScreen({ className, sections, onItemTap }: ListScreenProps) {
  const searchBar = sections.find(s => s.type === 'search-bar')
  const filterRow = sections.find(s => s.type === 'filter-row')
  const cardList = sections.find(s => s.type === 'card-list')

  return (
    <div className={className}>
      {/* Header */}
      <div className="list-header">
        <div className="list-title">{(cardList?.data.title as string) || 'Items'}</div>
        <button className="btn-add">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS.plus }} />
        </button>
      </div>

      {/* Search */}
      {searchBar && (
        <div className="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS.search }} />
          <input placeholder={searchBar.data.placeholder as string || 'Search...'} readOnly />
        </div>
      )}

      {/* Filters */}
      {filterRow && (
        <div className="filter-row">
          {(filterRow.data.filters as string[]).map((filter, i) => (
            <div key={i} className={`filter-chip${i === 0 ? ' active' : ''}`}>
              {filter}
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {cardList && (cardList.data.items as ListItem[]).map((item, i) => (
        <div key={i} className="list-card" onClick={onItemTap}>
          <div className="list-card-header">
            <div>
              <div className="list-card-title">{item.title}</div>
              <div className="list-card-code">{item.subtitle}</div>
            </div>
            {item.badge && (
              <span className={`item-badge badge-${item.badgeType || 'active'}`}>
                {item.badge}
              </span>
            )}
          </div>
          {item.stats && (
            <div className="list-card-stats">
              {item.stats.map((stat, j) => (
                <div key={j} className="list-card-stat">
                  <span className="list-card-stat-label">{stat.label}</span>
                  <span className="list-card-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
          {item.progress !== undefined && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${item.progress}%`, background: item.progress > 80 ? 'var(--green)' : 'var(--blue)' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
