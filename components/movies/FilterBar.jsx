'use client';

import { Field, Input, Select } from '../ui/Field';
import Button from '../ui/Button';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently added' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'year', label: 'Release year' },
];

export default function FilterBar({
  value = {},
  onChange,
  genres = [],
  years = [],
  languages = [],
  onReset,
}) {
  const current = {
    q: value.q ?? '',
    genre: value.genre ?? '',
    year: value.year ?? '',
    language: value.language ?? '',
    sort: value.sort ?? 'newest',
  };

  const update = (key, next) => {
    if (typeof onChange !== 'function') return;
    onChange({ ...current, [key]: next });
  };

  const hasFilters =
    Boolean(current.q) ||
    Boolean(current.genre) ||
    Boolean(current.year) ||
    Boolean(current.language) ||
    current.sort !== 'newest';

  const handleReset = () => {
    if (typeof onReset === 'function') {
      onReset();
      return;
    }
    if (typeof onChange === 'function') {
      onChange({ q: '', genre: '', year: '', language: '', sort: 'newest' });
    }
  };

  const safeList = (list) => (Array.isArray(list) ? list.filter((item) => item !== null && item !== undefined && item !== '') : []);

  return (
    <form
      className="filter-bar"
      role="search"
      aria-label="Filter the Nollywood catalogue"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="filter-bar__field filter-bar__field--wide">
        <Field label="Search films" htmlFor="filter-search" hint="Search by title, director or cast">
          <Input
            id="filter-search"
            name="q"
            type="search"
            placeholder="e.g. Lagos, Adesuwa, Kunle Afolayan"
            value={current.q}
            onChange={(event) => update('q', event.target.value)}
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="filter-bar__field">
        <Field label="Genre" htmlFor="filter-genre">
          <Select
            id="filter-genre"
            name="genre"
            value={current.genre}
            onChange={(event) => update('genre', event.target.value)}
          >
            <option value="">All genres</option>
            {safeList(genres).map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="filter-bar__field">
        <Field label="Year" htmlFor="filter-year">
          <Select
            id="filter-year"
            name="year"
            value={current.year}
            onChange={(event) => update('year', event.target.value)}
          >
            <option value="">All years</option>
            {safeList(years).map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="filter-bar__field">
        <Field label="Language" htmlFor="filter-language">
          <Select
            id="filter-language"
            name="language"
            value={current.language}
            onChange={(event) => update('language', event.target.value)}
          >
            <option value="">All languages</option>
            {safeList(languages).map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="filter-bar__field">
        <Field label="Sort by" htmlFor="filter-sort">
          <Select
            id="filter-sort"
            name="sort"
            value={current.sort}
            onChange={(event) => update('sort', event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="filter-bar__actions">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleReset}
          disabled={!hasFilters}
          aria-label="Clear all catalogue filters"
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
}