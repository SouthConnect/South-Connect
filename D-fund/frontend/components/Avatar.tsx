'use client'

import { useState } from 'react'
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  name?: string | null
  square?: boolean
  sizeClass?: string
  sizes?: string
}

export function Avatar({ src, name, square, sizeClass = 'w-10 h-10', sizes = '40px' }: AvatarProps) {
  const [error, setError] = useState(false)
  const showImg = !!src && !error
  return (
    <div className={`${sizeClass} shrink-0 ${square ? 'rounded-lg' : 'rounded-full'} bg-gray-100 overflow-hidden flex items-center justify-center font-bold text-sm text-[#3b49df] relative`}>
      {showImg
        ? <Image src={src!} alt="" fill className="object-cover" sizes={sizes} onError={() => setError(true)} />
        : (name?.[0]?.toUpperCase() || '?')}
    </div>
  )
}
