'use client';

import React from 'react';

/**
 * Table primitive.
 *
 * columns: [{ key, label, align: 'left' | 'right' | 'center', render: (row, index) => node }]
 * rows: array of data objects
 * getRowKey: (row, index) => string | number
 * emptyMessage: string shown when there are no rows
 */
export default function Table({
  columns = [],
  rows = [],
  getRowKey,
  emptyMessage = 'Nothing to show here yet.',
  caption,
}) {
  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeColumns.length === 0) {
    return (
      <div className="table-wrap">
        <p className="table__empty-text">No columns were configured for this table.</p>
      </div>
    );
  }

  const resolveKey = (row, index) => {
    if (typeof getRowKey === 'function') {
      try {
        const key = getRowKey(row, index);
        if (key !== undefined && key !== null && key !== '') return key;
      } catch (err) {
        // fall through to index-based key
      }
    }
    if (row && (row.id !== undefined && row.id !== null)) return row.id;
    return `row-${index}`;
  };

  const renderCell = (column, row, index) => {
    if (typeof column.render === 'function') {
      try {
        return column.render(row, index);
      } catch (err) {
        return <span className="table__cell-error">—</span>;
      }
    }
    const value = row ? row[column.key] : undefined;
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'object' && !React.isValidElement(value)) {
      return String(value);
    }
    return value;
  };

  const alignClass = (align) => {
    if (align === 'right') return 'table__cell--right';
    if (align === 'center') return 'table__cell--center';
    return 'table__cell--left';
  };

  return (
    <div className="table-wrap" role="region" aria-label={caption || 'Data table'} tabIndex={0}>
      <table className="table">
        {caption ? <caption className="table__caption">{caption}</caption> : null}
        <thead className="table__head">
          <tr>
            {safeColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`table__th ${alignClass(column.align)}`}
              >
                {column.label ?? column.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {safeRows.length === 0 ? (
            <tr className="table__row table__row--empty">
              <td className="table__td table__td--empty" colSpan={safeColumns.length}>
                <span className="table__empty-text">{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            safeRows.map((row, index) => (
              <tr key={resolveKey(row, index)} className="table__row">
                {safeColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`table__td ${alignClass(column.align)}`}
                    data-label={typeof column.label === 'string' ? column.label : column.key}
                  >
                    {renderCell(column, row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}