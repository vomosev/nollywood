export default function Badge({ tone = 'neutral', children, className = '', title, ...rest }) {
  const tones = ['neutral', 'accent', 'success', 'warning', 'danger'];
  const safeTone = tones.includes(tone) ? tone : 'neutral';
  const classes = ['badge', `badge--${safeTone}`, className].filter(Boolean).join(' ');

  if (children === null || children === undefined || children === false || children === '') {
    return null;
  }

  const label =
    title || (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined);

  return (
    <span className={classes} title={label} {...rest}>
      {children}
    </span>
  );
}