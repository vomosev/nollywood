import Link from 'next/link';

const catalogueLinks = [
  { href: '/movies', label: 'All films' },
  { href: '/movies?sort=newest', label: 'Recently added' },
  { href: '/movies?featured=true', label: 'Featured this week' },
  { href: '/movies?sort=year', label: 'By release year' },
];

const genreLinks = [
  { href: '/movies?genre=Drama', label: 'Drama' },
  { href: '/movies?genre=Comedy', label: 'Comedy' },
  { href: '/movies?genre=Thriller', label: 'Thriller' },
  { href: '/movies?genre=Epic', label: 'Epic' },
];

const accountLinks = [
  { href: '/login', label: 'Sign in' },
  { href: '/signup', label: 'Create an account' },
  { href: '/watchlist', label: 'Your watchlist' },
  { href: '/account', label: 'Account & history' },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <h2 className="site-footer__heading">About Nollywood</h2>
            <p className="site-footer__blurb">
              Nollywood is an independent distribution platform for Nigerian cinema. We licence
              features and shorts straight from the filmmakers in Lagos, Enugu and Abuja, then
              stream them with clean subtitles and fair revenue splits for the people who made them.
            </p>
          </div>

          <nav className="site-footer__nav" aria-labelledby="footer-catalogue">
            <h2 className="site-footer__heading" id="footer-catalogue">
              Catalogue
            </h2>
            <ul className="site-footer__links">
              {catalogueLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="site-footer__nav" aria-labelledby="footer-genres">
            <h2 className="site-footer__heading" id="footer-genres">
              Genres
            </h2>
            <ul className="site-footer__links">
              {genreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="site-footer__nav" aria-labelledby="footer-account">
            <h2 className="site-footer__heading" id="footer-account">
              Account
            </h2>
            <ul className="site-footer__links">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copy">
            &copy; {year} Nollywood Distribution Ltd. Every title streamed here is licensed directly
            from its rights holder.
          </p>
          <p className="site-footer__copy">Built in Lagos, streaming everywhere.</p>
        </div>
      </div>
    </footer>
  );
}