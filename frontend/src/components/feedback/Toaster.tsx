import React from 'react'
import { Toaster as SonnerToaster } from 'sonner'

export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      richColors={false}
      closeButton
      duration={4000}
      toastOptions={{
        className:
          '!bg-white !border-slate-200 !text-slate-900 !shadow-xl !rounded-none !p-3.5 !font-sans',
        descriptionClassName: '!text-slate-500 !text-xs !mt-1',
        classNames: {
          toast: 'group',
          title: 'text-xs font-semibold tracking-tight text-slate-900',
          description: 'text-[11px] text-slate-500',
          actionButton: '!bg-sky-700 hover:!bg-sky-800 !text-white !font-medium !text-xs !rounded-none !px-3 !py-1.5 !border-0',
          cancelButton: '!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !font-medium !text-xs !rounded-none !px-3 !py-1.5 !border !border-slate-300',
          closeButton: '!bg-slate-100 !border-slate-200 !text-slate-500 hover:!text-slate-800 !rounded-none',
          success: '!border-emerald-200 !text-emerald-800 [&>[data-icon]]:!text-emerald-600',
          error: '!border-rose-200 !text-rose-800 [&>[data-icon]]:!text-rose-600',
          warning: '!border-amber-200 !text-amber-800 [&>[data-icon]]:!text-amber-600',
          info: '!border-sky-200 !text-sky-800 [&>[data-icon]]:!text-sky-600',
        },
      }}
    />
  )
}

export { toast } from 'sonner'
