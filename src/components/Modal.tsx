import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg card rounded-b-none sm:rounded-xl2 p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-800">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-zinc-800">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
