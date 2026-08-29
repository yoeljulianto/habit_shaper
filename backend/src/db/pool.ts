import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "habit_user",
  password: process.env.DB_PASSWORD || "habit_password",
  database: process.env.DB_NAME || "habit_shaper",
  waitForConnections: true,
  connectionLimit: 10,
});

async function waitForDb(retries = 20, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return;
    } catch {
      console.log(`[db] waiting for database... (${i}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Could not connect to database after multiple retries");
}

export async function runMigrations(): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");

  await waitForDb();

  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf-8");
    const statements = sql.split(";").map((s: string) => s.trim()).filter(Boolean);
    for (const stmt of statements) await pool.query(stmt);
    console.log(`[db] applied migration: ${file}`);
  }
}
