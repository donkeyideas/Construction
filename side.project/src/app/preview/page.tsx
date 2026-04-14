import { Suspense } from 'react'
import PreviewClient from './PreviewClient'

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fafafa',
      }}>
        Loading...
      </div>
    }>
      <PreviewClient />
    </Suspense>
  )
}
