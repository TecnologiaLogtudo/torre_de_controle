import React from 'react'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { RotateCw } from 'lucide-react'

export interface ErrorAlertProps {
  message: string
  title?: string
  onRetry?: () => void
  onClose?: () => void
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  title = 'Falha na requisição',
  onRetry,
  onClose,
}) => {
  return (
    <Alert type="error" title={title} onClose={onClose} className="my-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            Tentar novamente
          </Button>
        )}
      </div>
    </Alert>
  )
}
