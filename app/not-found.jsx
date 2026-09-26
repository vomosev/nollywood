import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export const metadata = {
  title: 'Page not found — Nollywood',
  description: 'The page you were looking for is no longer part of our catalogue.',
};

export default function NotFound() {
  return (
    <PageShell
      title="Page not found"
      intro="The link you followed may be out of date, or the title has been pulled from distribution."
    >
      <EmptyState
        variant="error"
        title="We couldn't find that reel"
        message="This page is missing from the projection room. Head back to the catalogue to keep browsing Nigerian cinema."
        action={
          <Button as="a" href="/movies" variant="primary" size="md">
            Browse the catalogue
          </Button>
        }
      />
    </PageShell>
  );
}