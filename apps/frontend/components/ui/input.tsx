import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-sm font-medium text-gray-700">{label}</label>
    )}
    <input
      ref={ref}
      className={clsx(
        'rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
        'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
        error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
))

Input.displayName = 'Input'
