type Props = React.ComponentProps<'svg'> & {
  transparent?: boolean
  padding?: number
}

export function IconFrame({
  transparent = false,
  padding = 0,
  fill = 'url(#fill)', // can be used to add interesting fills
  children,
  ...props
}: Props) {
  const size = 100 - padding * 2
  const scale = size > 0 ? 100 / size : 1

  const content = (
    <g transform={`translate(50 50) scale(${scale}) translate(-50 -50)`}>
      {children}
    </g>
  )

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 100 100'
      fill={transparent ? 'transparent' : '#ffffff33'}
      {...props}>
      {transparent ? (
        content
      ) : (
        <g clipPath='url(#app-icon-clip)'>
          <rect width='100' height='100' fill={fill} />
          {content}
          <use
            href='#app-icon-shape'
            fill='none'
            stroke='rgba(255,255,255,.20)'
            strokeWidth='2'
          />
        </g>
      )}
    </svg>
  )
}
