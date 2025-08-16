import pg from 'pg';

// Inisialisasi pool koneksi sekali saja untuk digunakan kembali
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Ekspor objek untuk melakukan query, menyederhanakan akses database
export const db = {
  query: (text, params) => pool.query(text, params),
};
