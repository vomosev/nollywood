export function CardHeader({ children, className = '', ...rest }) {
  return (
    <div className={['card__header', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...rest }) {
  return (
    <div className={['card__body', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...rest }) {
  return (
    <div className={['card__footer', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

const PADDINGS = {
  none: 'card--pad-none',
  sm: 'card--pad-sm',
  md: 'card--pad-md',
  lg: 'card--pad-lg',
};

export default function Card({
  as = 'div',
  interactive = false,
  padding = 'md',
  children,
  className = '',
  ...rest
}) {
  const Tag = as || 'div';
  const paddingClass = PADDINGS[padding] || PADDINGS.md;

  const classes = ['card', paddingClass, interactive ? 'card--interactive' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}