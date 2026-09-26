export default function PageShell({ title, intro, actions, children }) {
  const hasHeader = Boolean(title || intro || actions);

  return (
    <section className="page">
      <div className="shell">
        {hasHeader ? (
          <header className="page__header">
            <div className="page__heading">
              {title ? <h1 className="page__title">{title}</h1> : null}
              {intro ? <p className="page__intro">{intro}</p> : null}
            </div>
            {actions ? <div className="page__actions cluster">{actions}</div> : null}
          </header>
        ) : null}
        <div className="page__body">{children}</div>
      </div>
    </section>
  );
}