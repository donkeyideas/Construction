'use client'

import { type CSSProperties } from 'react'
import type { MockupConfig, CSSVariableSet } from '@/lib/types/generator'
import StatusBar from './StatusBar'
import TabBar from './TabBar'
import ScreenRenderer from './ScreenRenderer'

interface PhoneFrameProps {
  config: MockupConfig
  activeScreen: string
  theme: 'light' | 'dark'
  onScreenChange: (screenId: string) => void
}

export default function PhoneFrame({ config, activeScreen, theme, onScreenChange }: PhoneFrameProps) {
  const cssVars = theme === 'dark' ? config.theme.dark : config.theme.light
  const fontVars = {
    '--font-heading': `'${config.theme.fonts.heading}', -apple-system, sans-serif`,
    '--font-body': `'${config.theme.fonts.body}', -apple-system, sans-serif`,
  }

  const innerStyle: CSSProperties = {
    ...cssVars as unknown as CSSProperties,
    ...fontVars as unknown as CSSProperties,
  } as CSSProperties

  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div
        className={`phone-inner${theme === 'dark' ? ' dark' : ''}`}
        style={innerStyle as CSSProperties & Record<string, string>}
      >
        <StatusBar theme={theme} activeScreen={activeScreen} />

        {config.screens.map(screen => (
          <ScreenRenderer
            key={screen.id}
            screen={screen}
            isActive={screen.id === activeScreen}
            config={config}
            onScreenChange={onScreenChange}
          />
        ))}

        <TabBar
          tabs={config.tabs}
          activeTab={activeScreen}
          onTabChange={onScreenChange}
        />

        <div className="home-indicator" />
      </div>
    </div>
  )
}
