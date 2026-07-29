import { twMerge } from 'tailwind-merge'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-10 h-10 border-[3px]',
}

/** Single spinner construction used app-wide — replaces the border-2/border-4/border-b-only variants. */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={twMerge(
        SIZES[size],
        'border-[#3b49df] border-t-transparent rounded-full animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]',
        className,
      )}
      role="status"
      aria-label="Chargement"
    />
  )
}
