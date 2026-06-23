interface AvatarProps {
  src: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'rounded'
  className?: string
}

const sizeClasses = {
  sm: 'w-9 h-9 text-lg',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-28 h-28 text-5xl',
}

const shapeClasses = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
}

export function Avatar({ src, alt, size = 'md', shape = 'rounded', className = '' }: AvatarProps) {
  return (
    <div
      className={[
        'bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center',
        sizeClasses[size],
        shapeClasses[shape],
        className,
      ].join(' ')}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="text-gray-300">👤</span>
      )}
    </div>
  )
}
