import React from 'react'
import { Toaster as SonnerToaster } from 'sonner'

export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors={false}
      closeButton
      duration={4000}
      toastOptions={{
        className:
          '!bg-logtudo-deep !border-logtudo-border/80 !text-slate-100 !shadow-2xl !rounded-xl !p-4 !font-sans backdrop-blur-md',
        descriptionClassName: '!text-slate-400 !text-xs !mt-1',
        classNames: {
          toast: 'group',
          title: 'text-sm font-semibold tracking-tight',
          description: 'text-xs text-slate-400',
          actionButton: '!bg-logtudo-primary hover:!bg-logtudo-hover !text-white !font-medium !text-xs !rounded-lg !px-3 !py-1.5',
          cancelButton: '!bg-slate-800 hover:!bg-slate-700 !text-slate-300 !font-medium !text-xs !rounded-lg !px-3 !py-1.5',
          closeButton: '!bg-slate-800/80 !border-logtudo-border !text-slate-400 hover:!text-white',
          success: '!border-emerald-800/80 !text-emerald-300 [&>[data-icon]]:!text-emerald-400',
          error: '!border-red-800/80 !text-red-300 [&>[data-icon]]:!text-red-400',
          warning: '!border-amber-800/80 !text-amber-300 [&>[data-icon]]:!text-amber-400',
          info: '!border-logtudo-border !text-logtudo-accent [&>[data-icon]]:!text-logtudo-accent',
        },
      }}
    />
  )
}

export { toast } from 'sonner'
