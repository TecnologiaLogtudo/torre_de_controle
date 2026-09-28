import React from 'react'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { AppRouter } from '@/app/router'
import { Toaster } from '@/components/feedback/Toaster'

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster />
    </AuthProvider>
  )
}

export default App
