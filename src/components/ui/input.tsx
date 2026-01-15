import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string
  /** Error message displayed below the input */
  error?: string
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, size = 'md', id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-charcoal-200">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-charcoal-800 text-charcoal-100',
            'placeholder:text-charcoal-500',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-bronze-500/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            sizeStyles[size],
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-charcoal-600 focus:border-bronze-500',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-charcoal-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
