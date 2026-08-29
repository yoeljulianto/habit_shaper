import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { JWT_SECRET } from "../middleware/auth";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function register(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "invalid email format" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (Array.isArray(existing) && existing.length > 0) {
    return res.status(409).json({ error: "email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result]: any = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)",
    [email, passwordHash]
  );

  const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: "7d" });
  return res.status(201).json({ token, user: { id: result.insertId, email } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const [rows]: any = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user.id, email: user.email } });
}
