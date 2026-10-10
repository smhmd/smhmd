import clsx from 'clsx'

/** One recessed cell of the keyboard deck. Everything sits in one of these. */
export function Base({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={clsx('cell relative grid', className)} {...props} />
}
