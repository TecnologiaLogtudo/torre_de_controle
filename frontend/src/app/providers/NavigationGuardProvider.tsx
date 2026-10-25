import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface PendingNavigation {
  targetUrl: string
  onConfirmLeave: () => void
}

interface NavigationGuardContextType {
  isBlocked: boolean
  setBlocked: (blocked: boolean) => void
  requestNavigation: (targetUrl: string, onConfirmLeave: () => void) => boolean
  pendingNavigation: PendingNavigation | null
  clearPendingNavigation: () => void
}

const NavigationGuardContext = createContext<NavigationGuardContextType | undefined>(undefined)

export const NavigationGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBlocked, setIsBlocked] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null)

  const requestNavigation = useCallback(
    (targetUrl: string, onConfirmLeave: () => void) => {
      if (isBlocked) {
        setPendingNavigation({ targetUrl, onConfirmLeave })
        return false // Bloqueado
      }
      return true // Permitido
    },
    [isBlocked]
  )

  const clearPendingNavigation = useCallback(() => {
    setPendingNavigation(null)
  }, [])

  // Alerta nativo do navegador caso o usuário tente fechar a aba ou recarregar
  useEffect(() => {
    if (!isBlocked) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isBlocked])

  return (
    <NavigationGuardContext.Provider
      value={{
        isBlocked,
        setBlocked: setIsBlocked,
        requestNavigation,
        pendingNavigation,
        clearPendingNavigation,
      }}
    >
      {children}
    </NavigationGuardContext.Provider>
  )
}

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext)
  if (!context) {
    // Fallback gracioso para ambientes de teste ou rotas sem provider explícito
    return {
      isBlocked: false,
      setBlocked: () => {},
      requestNavigation: () => true,
      pendingNavigation: null,
      clearPendingNavigation: () => {},
    }
  }
  return context
}
