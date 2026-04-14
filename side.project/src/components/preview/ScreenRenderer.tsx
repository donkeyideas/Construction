'use client'

import type { MockupConfig, ScreenData } from '@/lib/types/generator'
import SplashScreen from './screens/SplashScreen'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import ListScreen from './screens/ListScreen'
import DetailScreen from './screens/DetailScreen'
import MoreScreen from './screens/MoreScreen'
import ContactScreen from './screens/ContactScreen'

interface ScreenRendererProps {
  screen: ScreenData
  isActive: boolean
  config: MockupConfig
  onScreenChange: (screenId: string) => void
}

export default function ScreenRenderer({ screen, isActive, config, onScreenChange }: ScreenRendererProps) {
  const className = `screen ${screen.type}-screen${isActive ? ' active' : ''}`

  switch (screen.type) {
    case 'splash':
      return (
        <SplashScreen
          className={className}
          brand={config.brand}
          onTap={() => onScreenChange('login')}
        />
      )
    case 'login':
      return (
        <LoginScreen
          className={className}
          brand={config.brand}
          onLogin={() => onScreenChange('dashboard')}
        />
      )
    case 'dashboard':
      return (
        <DashboardScreen
          className={className}
          sections={screen.sections}
          brand={config.brand}
          onItemTap={() => onScreenChange('detail')}
        />
      )
    case 'list':
      return (
        <ListScreen
          className={className}
          sections={screen.sections}
          onItemTap={() => onScreenChange('detail')}
        />
      )
    case 'detail':
      return (
        <DetailScreen
          className={className}
          sections={screen.sections}
          onBack={() => onScreenChange('list')}
        />
      )
    case 'more':
      return (
        <MoreScreen
          className={className}
          sections={screen.sections}
        />
      )
    case 'contact':
      return (
        <ContactScreen
          className={className}
          sections={screen.sections}
        />
      )
    default:
      return null
  }
}
