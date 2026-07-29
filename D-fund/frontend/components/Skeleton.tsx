import { twMerge } from 'tailwind-merge'

interface SkeletonProps {
  className?: string
}

/** Placeholder block for loading states. Compose via className (w-/h-/rounded-) to match the shape of the content it stands in for. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={twMerge('skeleton-shimmer bg-gray-100 rounded-lg', className)} />
}
