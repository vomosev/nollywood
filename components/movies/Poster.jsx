import { hueToGradient } from '../../lib/format';

/**
 * Poster
 *
 * Renders a reserved 2/3 aspect-ratio box filled with a deterministic CSS
 * gradient derived from the film's `poster_hue`, an inline SVG film-strip
 * motif and the title overlaid. No external or invented image URLs are used,
 * so a poster can never 404 and the layout never reflows once data lands.
 */
export default function Poster({ title = 'Untitled film', hue = 38, size = 'card' }) {
  const safeHue = Number.isFinite(Number(hue)) ? ((Number(hue) % 360) + 360) % 360 : 38;
  const gradient =
    typeof hueToGradient === 'function'
      ? hueToGradient(safeHue)
      : `linear-gradient(160deg, hsl(${safeHue} 62% 28%) 0%, hsl(${(safeHue + 28) % 360} 54% 16%) 100%)`;

  const sizeClass = size === 'detail' ? 'poster--detail' : 'poster--card';
  const initials = getInitials(title);

  return (
    <div
      className={`poster ${sizeClass}`}
      style={{ backgroundImage: gradient }}
      role="img"
      aria-label={`Poster artwork for ${title}`}
    >
      <svg
        className="poster__motif"
        viewBox="0 0 120 180"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`poster-sheen-${safeHue}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="120" height="180" fill={`url(#poster-sheen-${safeHue})`} />

        {/* Film strip rails */}
        <rect x="0" y="0" width="13" height="180" fill="rgba(0,0,0,0.30)" />
        <rect x="107" y="0" width="13" height="180" fill="rgba(0,0,0,0.30)" />
        {PERFORATIONS.map((y) => (
          <g key={y}>
            <rect x="3.5" y={y} width="6" height="9" rx="1.5" fill="rgba(255,255,255,0.30)" />
            <rect x="110.5" y={y} width="6" height="9" rx="1.5" fill="rgba(255,255,255,0.30)" />
          </g>
        ))}

        {/* Projector beam motif */}
        <path
          d="M60 34 L96 128 L24 128 Z"
          fill="rgba(255,255,255,0.10)"
        />
        <circle cx="60" cy="34" r="9" fill="rgba(255,255,255,0.26)" />
        <circle cx="60" cy="34" r="3.5" fill="rgba(0,0,0,0.35)" />
        <rect x="24" y="132" width="72" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
      </svg>

      <span className="poster__initials" aria-hidden="true">
        {initials}
      </span>

      <span className="poster__label">
        <span className="poster__title">{title}</span>
      </span>
    </div>
  );
}

const PERFORATIONS = [8, 26, 44, 62, 80, 98, 116, 134, 152, 166];

function getInitials(title) {
  if (typeof title !== 'string' || !title.trim()) return 'NW';
  const words = title
    .trim()
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word));
  if (words.length === 0) return 'NW';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}