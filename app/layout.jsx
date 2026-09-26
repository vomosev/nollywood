import './globals.css';
import { AuthProvider } from '../components/providers/AuthProvider';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';

export const metadata = {
  metadataBase: new URL('https://nollywood.arx-app.com'),
  title: 'Nollywood — Stream the best of Nigerian cinema',
  description:
    'Nollywood is a video distribution platform for Nigerian cinema. Browse a curated catalogue of films, watch trailers and streams, build a watchlist and share your reviews.',
  applicationName: 'Nollywood',
  keywords: [
    'Nollywood',
    'Nigerian cinema',
    'African film',
    'streaming',
    'movies',
    'watchlist'
  ],
  openGraph: {
    type: 'website',
    siteName: 'Nollywood',
    title: 'Nollywood — Stream the best of Nigerian cinema',
    description:
      'A curated catalogue of Nigerian films: drama, comedy, thriller, romance and epic storytelling from Lagos to Enugu.',
    url: 'https://nollywood.arx-app.com'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14110f'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <SiteHeader />
          <main className="site-main" id="main-content">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}