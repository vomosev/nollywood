'use strict';

/**
 * Nollywood — database seed script
 *
 * Usage: node server/db/seed.js
 *
 * 1. Reads schema.sql from the project root and executes each statement.
 * 2. Inserts idempotent sample data (movies, users, reviews, watchlist rows).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { pool, checkDatabaseConnection } = require('../config/db');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schema.sql');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[seed] ${message}`);
}

function logError(message, err) {
  // eslint-disable-next-line no-console
  console.error(`[seed] ${message}`, err && err.message ? err.message : err || '');
}

/**
 * Split a .sql file into individual statements.
 * Strips `--` line comments and `/* *\/` block comments, respects quoted strings.
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        current += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (char === '-' && next === '-') {
        inLineComment = true;
        i += 1;
        continue;
      }
      if (char === '#') {
        inLineComment = true;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (char === "'" && !inDouble && !inBacktick) {
      const prev = sql[i - 1];
      if (prev !== '\\') inSingle = !inSingle;
    } else if (char === '"' && !inSingle && !inBacktick) {
      const prev = sql[i - 1];
      if (prev !== '\\') inDouble = !inDouble;
    } else if (char === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
    }

    if (char === ';' && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
}

async function runSchema() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`schema.sql not found at ${SCHEMA_PATH}`);
  }

  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const statements = splitSqlStatements(raw);

  log(`Applying schema.sql (${statements.length} statements)…`);

  let applied = 0;
  for (const statement of statements) {
    try {
      await pool.query(statement);
      applied += 1;
    } catch (err) {
      // Tolerate benign "already exists" style errors so the script stays idempotent.
      const benign = [
        'ER_TABLE_EXISTS_ERROR',
        'ER_DUP_KEYNAME',
        'ER_DUP_FIELDNAME',
        'ER_DB_CREATE_EXISTS',
      ];
      if (benign.includes(err.code)) {
        applied += 1;
        continue;
      }
      logError(`Failed statement:\n${statement.slice(0, 200)}\n`, err);
      throw err;
    }
  }

  log(`Schema applied (${applied}/${statements.length} statements ok).`);
}

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const MOVIES = [
  {
    slug: 'the-lagos-inheritance',
    title: 'The Lagos Inheritance',
    synopsis:
      'When a shipping magnate dies without a will, his three estranged children return to Lagos to fight over a crumbling empire — and discover a fourth heir nobody was supposed to know about.',
    release_year: 2023,
    runtime_minutes: 128,
    genre: 'Drama',
    language: 'English',
    rating_certificate: '15',
    director: 'Chidinma Okafor',
    cast_list: 'Genevieve Nnaji-Obi, Richard Adeyemi, Tope Balogun, Ngozi Eze',
    poster_hue: 38,
    stream_url: null,
    trailer_url: null,
    is_featured: 1,
  },
  {
    slug: 'owambe-saturday',
    title: 'Owambe Saturday',
    synopsis:
      'Two rival party planners are forced to share a venue on the biggest wedding weekend of the year, and the aso-ebi war that follows takes all of Surulere hostage.',
    release_year: 2022,
    runtime_minutes: 104,
    genre: 'Comedy',
    language: 'Pidgin',
    rating_certificate: 'PG',
    director: 'Bolaji Ifeanyi',
    cast_list: 'Funke Daramola, Segun Alabi, Ada Nwosu, Kelechi Duru',
    poster_hue: 12,
    stream_url: null,
    trailer_url: null,
    is_featured: 1,
  },
  {
    slug: 'harmattan-nights',
    title: 'Harmattan Nights',
    synopsis:
      'A detective in Jos races against a dust-choked December to find a missing choir girl, uncovering a network of silence that runs through the church she grew up in.',
    release_year: 2021,
    runtime_minutes: 117,
    genre: 'Thriller',
    language: 'English',
    rating_certificate: '18',
    director: 'Emeka Anyanwu',
    cast_list: 'Uche Mbadiwe, Sarah Danladi, Ibrahim Sule, Peace Obidike',
    poster_hue: 210,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'the-bride-price',
    title: 'The Bride Price',
    synopsis:
      'A Lagos software engineer must convince her fiancé’s traditional Igbo family that a woman who earns more than her husband can still keep a home.',
    release_year: 2024,
    runtime_minutes: 112,
    genre: 'Romance',
    language: 'Igbo',
    rating_certificate: 'PG',
    director: 'Nkechi Umeh',
    cast_list: 'Amaka Onuoha, Tobi Fashola, Ejike Nwankwo, Blessing Iheme',
    poster_hue: 330,
    stream_url: null,
    trailer_url: null,
    is_featured: 1,
  },
  {
    slug: 'oba-of-the-seven-rivers',
    title: 'Oba of the Seven Rivers',
    synopsis:
      'In pre-colonial Benin, a warrior-prince returns from exile to claim a throne guarded by a council that has learned to rule without kings.',
    release_year: 2020,
    runtime_minutes: 146,
    genre: 'Epic',
    language: 'English',
    rating_certificate: '15',
    director: 'Kunle Oyelaran',
    cast_list: 'Femi Adebayo-Cole, Rita Okonkwo, Dapo Ogundimu, Hauwa Bello',
    poster_hue: 28,
    stream_url: null,
    trailer_url: null,
    is_featured: 1,
  },
  {
    slug: 'agege-bread-boys',
    title: 'Agege Bread Boys',
    synopsis:
      'Three childhood friends turn their grandmother’s bakery into the most talked-about brand in Lagos, until an investor offers them a deal that costs more than money.',
    release_year: 2023,
    runtime_minutes: 98,
    genre: 'Comedy',
    language: 'Pidgin',
    rating_certificate: 'PG',
    director: 'Sola Bankole',
    cast_list: 'Chike Obiora, Yemi Sanusi, Musa Garba, Tolu Aina',
    poster_hue: 48,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'ile-oriaku',
    title: 'Ile Oriaku',
    synopsis:
      'A widow refuses to leave the family compound her in-laws insist she has no claim to, and one woman’s stubbornness becomes an entire village’s reckoning.',
    release_year: 2019,
    runtime_minutes: 121,
    genre: 'Drama',
    language: 'Igbo',
    rating_certificate: '15',
    director: 'Ifeoma Chukwuma',
    cast_list: 'Patience Ugoh, Nnamdi Eke, Chioma Best, Obi Nwachukwu',
    poster_hue: 150,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'the-third-mainland',
    title: 'The Third Mainland',
    synopsis:
      'A bank courier survives an armed robbery on the bridge and discovers the heist was arranged by the people signing his payslip.',
    release_year: 2022,
    runtime_minutes: 109,
    genre: 'Thriller',
    language: 'English',
    rating_certificate: '18',
    director: 'Gbenga Martins',
    cast_list: 'Daniel Okoye, Zainab Lawal, Tunde Ade-Ojo, Grace Nkemdirim',
    poster_hue: 195,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'mama-put',
    title: 'Mama Put',
    synopsis:
      'A roadside food seller in Ibadan quietly funds an entire street through university, one plate of amala at a time, until the council comes for her stall.',
    release_year: 2018,
    runtime_minutes: 95,
    genre: 'Family',
    language: 'Yoruba',
    rating_certificate: 'U',
    director: 'Abike Oyedepo',
    cast_list: 'Iyabo Ogunleye, Sikiru Bello, Kemi Adewale, Lanre Fatai',
    poster_hue: 90,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'nkwo-market-day',
    title: 'Nkwo Market Day',
    synopsis:
      'On the busiest market day of the year, a stolen bag of cocoa money sets off a chain of accusations that tests a trading community built on trust.',
    release_year: 2017,
    runtime_minutes: 103,
    genre: 'Drama',
    language: 'Igbo',
    rating_certificate: 'PG',
    director: 'Emeka Anyanwu',
    cast_list: 'Chinedu Ozor, Adaeze Mba, Sunday Eboh, Rita Okonkwo',
    poster_hue: 260,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'love-in-yaba',
    title: 'Love in Yaba',
    synopsis:
      'Two startup founders pitching for the same grant fall for each other over three weeks of demo days, bad jollof and worse Wi-Fi.',
    release_year: 2024,
    runtime_minutes: 101,
    genre: 'Romance',
    language: 'English',
    rating_certificate: 'PG',
    director: 'Tosin Arinze',
    cast_list: 'Simi Adeleke, Jide Ogunbanwo, Nneka Ilo, Baba Sadiq',
    poster_hue: 300,
    stream_url: null,
    trailer_url: null,
    is_featured: 1,
  },
  {
    slug: 'the-ghost-of-oyo',
    title: 'The Ghost of Oyo',
    synopsis:
      'A history professor investigating a royal masquerade finds that the story her family has told for four generations was written to cover a murder.',
    release_year: 2021,
    runtime_minutes: 133,
    genre: 'Epic',
    language: 'Yoruba',
    rating_certificate: '15',
    director: 'Kunle Oyelaran',
    cast_list: 'Bukola Adeniyi, Wale Ogunsola, Halima Yusuf, Femi Adebayo-Cole',
    poster_hue: 20,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'okada-dreams',
    title: 'Okada Dreams',
    synopsis:
      'A commercial motorcyclist with a talent for engineering builds an electric bike in his backyard and takes on the transport union that wants him gone.',
    release_year: 2023,
    runtime_minutes: 115,
    genre: 'Drama',
    language: 'Pidgin',
    rating_certificate: 'PG',
    director: 'Sola Bankole',
    cast_list: 'Musa Garba, Ifeanyi Okolie, Tolu Aina, Mercy Ibe',
    poster_hue: 172,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'aunty-comfort-returns',
    title: 'Aunty Comfort Returns',
    synopsis:
      'After twelve years in Houston, a legendary aunt lands in Enugu with two suitcases, strong opinions and a plan to marry off every unmarried relative by Christmas.',
    release_year: 2016,
    runtime_minutes: 107,
    genre: 'Comedy',
    language: 'English',
    rating_certificate: 'PG',
    director: 'Nkechi Umeh',
    cast_list: 'Patience Ugoh, Kelechi Duru, Ada Nwosu, Chike Obiora',
    poster_hue: 55,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'silent-benue',
    title: 'Silent Benue',
    synopsis:
      'A young nurse posted to a rural clinic documents what the state refuses to report, and her phone becomes the most dangerous thing in the valley.',
    release_year: 2020,
    runtime_minutes: 124,
    genre: 'Thriller',
    language: 'English',
    rating_certificate: '18',
    director: 'Gbenga Martins',
    cast_list: 'Sarah Danladi, Ibrahim Sule, Peace Obidike, Daniel Okoye',
    poster_hue: 230,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'the-tailor-of-aba',
    title: 'The Tailor of Aba',
    synopsis:
      'A master tailor whose designs are copied by a Lagos fashion house takes his case — and his workshop of apprentices — all the way to the national press.',
    release_year: 2015,
    runtime_minutes: 99,
    genre: 'Drama',
    language: 'Igbo',
    rating_certificate: 'PG',
    director: 'Ifeoma Chukwuma',
    cast_list: 'Obi Nwachukwu, Blessing Iheme, Sunday Eboh, Amaka Onuoha',
    poster_hue: 280,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'sisi-eko',
    title: 'Sisi Eko',
    synopsis:
      'A Lagos schoolgirl discovers her late mother was the city’s most celebrated highlife singer and sets out to finish the album that was never released.',
    release_year: 2014,
    runtime_minutes: 96,
    genre: 'Family',
    language: 'Yoruba',
    rating_certificate: 'U',
    director: 'Abike Oyedepo',
    cast_list: 'Kemi Adewale, Iyabo Ogunleye, Lanre Fatai, Simi Adeleke',
    poster_hue: 120,
    stream_url: null,
    trailer_url: null,
    is_featured: 0,
  },
  {
    slug: 'december-in-enugu',
    title: 'December in Enugu',
    synopsis:
      'Five cousins scattered across three continents come home for one last Christmas in their grandfather’s house before it is sold, and every buried grudge comes with them.',
    release_year: 2024,
    runtime_minutes: 119,
    genre: 'Family',
    language: 'English',
    rating_certificate: 'PG',
    director: 'Chidinma Okafor',
    cast_list: 'Ngozi Eze, Tobi Fashola, Chioma Best, Nnamdi Eke, Mercy Ibe',
    poster_hue: 8,
    stream_url: null,
    trailer_url: null,
    is_featured: 1,
  },
];

const USERS = [
  {
    name: 'Adaeze Nwosu',
    email: 'admin@nollywood.test',
    password: 'Nollywood2024',
    role: 'admin',
  },
  {
    name: 'Tunde Bakare',
    email: 'viewer@nollywood.test',
    password: 'Nollywood2024',
    role: 'viewer',
  },
];

const REVIEWS = [
  {
    email: 'viewer@nollywood.test',
    slug: 'the-lagos-inheritance',
    rating: 5,
    body: 'Easily the best family drama out of Lagos in years. The courtroom scene in the third act had me on my feet.',
  },
  {
    email: 'viewer@nollywood.test',
    slug: 'owambe-saturday',
    rating: 4,
    body: 'Genuinely funny from start to finish. The aso-ebi negotiation sequence is going straight into the group chat.',
  },
  {
    email: 'viewer@nollywood.test',
    slug: 'the-bride-price',
    rating: 5,
    body: 'Beautifully shot and the Igbo dialogue is handled with real care. Amaka Onuoha is superb.',
  },
  {
    email: 'admin@nollywood.test',
    slug: 'oba-of-the-seven-rivers',
    rating: 5,
    body: 'The production design alone justifies the ticket. A serious attempt at historical epic filmmaking.',
  },
  {
    email: 'admin@nollywood.test',
    slug: 'harmattan-nights',
    rating: 4,
    body: 'Tense, restrained and quietly devastating. The Jos location work gives it a texture you rarely see.',
  },
  {
    email: 'admin@nollywood.test',
    slug: 'okada-dreams',
    rating: 4,
    body: 'A warm, well-observed underdog story with a lead performance that carries every scene.',
  },
];

const WATCHLIST = [
  { email: 'viewer@nollywood.test', slug: 'december-in-enugu' },
  { email: 'viewer@nollywood.test', slug: 'love-in-yaba' },
  { email: 'viewer@nollywood.test', slug: 'the-ghost-of-oyo' },
  { email: 'admin@nollywood.test', slug: 'silent-benue' },
  { email: 'admin@nollywood.test', slug: 'mama-put' },
];

const HISTORY = [
  { email: 'viewer@nollywood.test', slug: 'the-lagos-inheritance', seconds: 4210 },
  { email: 'viewer@nollywood.test', slug: 'owambe-saturday', seconds: 1880 },
  { email: 'admin@nollywood.test', slug: 'oba-of-the-seven-rivers', seconds: 6900 },
];

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

async function seedMovies() {
  const sql = `
    INSERT INTO movies
      (slug, title, synopsis, release_year, runtime_minutes, genre, language,
       rating_certificate, director, cast_list, poster_hue, stream_url, trailer_url, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      synopsis = VALUES(synopsis),
      release_year = VALUES(release_year),
      runtime_minutes = VALUES(runtime_minutes),
      genre = VALUES(genre),
      language = VALUES(language),
      rating_certificate = VALUES(rating_certificate),
      director = VALUES(director),
      cast_list = VALUES(cast_list),
      poster_hue = VALUES(poster_hue),
      stream_url = VALUES(stream_url),
      trailer_url = VALUES(trailer_url),
      is_featured = VALUES(is_featured)
  `;

  for (const m of MOVIES) {
    await pool.execute(sql, [
      m.slug,
      m.title,
      m.synopsis,
      m.release_year,
      m.runtime_minutes,
      m.genre,
      m.language,
      m.rating_certificate,
      m.director,
      m.cast_list,
      m.poster_hue,
      m.stream_url,
      m.trailer_url,
      m.is_featured,
    ]);
  }

  log(`Seeded ${MOVIES.length} movies.`);
}

async function seedUsers() {
  const sql = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password_hash = VALUES(password_hash),
      role = VALUES(role)
  `;

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.execute(sql, [u.name, u.email, hash, u.role]);
  }

  log(`Seeded ${USERS.length} demo users (password for both: Nollywood2024).`);
}

async function loadIdMaps() {
  const [userRows] = await pool.query('SELECT id, email FROM users');
  const [movieRows] = await pool.query('SELECT id, slug FROM movies');

  const userIds = new Map(userRows.map((r) => [r.email, r.id]));
  const movieIds = new Map(movieRows.map((r) => [r.slug, r.id]));

  return { userIds, movieIds };
}

async function seedReviews(userIds, movieIds) {
  const sql = `
    INSERT INTO reviews (user_id, movie_id, rating, body)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      rating = VALUES(rating),
      body = VALUES(body)
  `;

  let count = 0;
  for (const r of REVIEWS) {
    const userId = userIds.get(r.email);
    const movieId = movieIds.get(r.slug);
    if (!userId || !movieId) continue;
    await pool.execute(sql, [userId, movieId, r.rating, r.body]);
    count += 1;
  }

  log(`Seeded ${count} reviews.`);
}

async function seedWatchlist(userIds, movieIds) {
  const sql = `
    INSERT INTO watchlist (user_id, movie_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)
  `;

  let count = 0;
  for (const w of WATCHLIST) {
    const userId = userIds.get(w.email);
    const movieId = movieIds.get(w.slug);
    if (!userId || !movieId) continue;
    await pool.execute(sql, [userId, movieId]);
    count += 1;
  }

  log(`Seeded ${count} watchlist entries.`);
}

async function seedHistory(userIds, movieIds) {
  let count = 0;
  for (const h of HISTORY) {
    const userId = userIds.get(h.email);
    const movieId = movieIds.get(h.slug);
    if (!userId || !movieId) continue;

    const [existing] = await pool.execute(
      'SELECT id FROM watch_history WHERE user_id = ? AND movie_id = ? LIMIT 1',
      [userId, movieId]
    );

    if (existing.length) {
      await pool.execute(
        'UPDATE watch_history SET progress_seconds = ?, watched_at = NOW() WHERE id = ?',
        [h.seconds, existing[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO watch_history (user_id, movie_id, progress_seconds) VALUES (?, ?, ?)',
        [userId, movieId, h.seconds]
      );
    }
    count += 1;
  }

  log(`Seeded ${count} watch history rows.`);
}

async function summarise() {
  const tables = ['users', 'movies', 'reviews', 'watchlist', 'watch_history'];
  const summary = {};

  for (const table of tables) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
      summary[table] = rows[0].total;
    } catch (err) {
      summary[table] = 'n/a';
    }
  }

  log('--- Summary -------------------------------');
  Object.keys(summary).forEach((table) => {
    log(`${table.padEnd(16)} ${summary[table]}`);
  });
  log('-------------------------------------------');
}

async function main() {
  log('Starting Nollywood database seed…');

  const connected = await checkDatabaseConnection();
  if (!connected) {
    throw new Error(
      'Cannot reach MySQL. Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in your .env file.'
    );
  }
  log('Database connection OK.');

  await runSchema();
  await seedMovies();
  await seedUsers();

  const { userIds, movieIds } = await loadIdMaps();

  await seedReviews(userIds, movieIds);
  await seedWatchlist(userIds, movieIds);
  await seedHistory(userIds, movieIds);
  await summarise();

  log('Seed complete.');
}

main()
  .then(async () => {
    try {
      await pool.end();
    } catch (err) {
      /* pool already closed */
    }
    process.exit(0);
  })
  .catch(async (err) => {
    logError('Seed failed:', err);
    if (err && err.stack && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(err.stack);
    }
    try {
      await pool.end();
    } catch (closeErr) {
      /* ignore */
    }
    process.exit(1);
  });