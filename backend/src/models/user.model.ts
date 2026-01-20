import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface User {
  id: number;
  email: string;
  password: string;
  full_name: string;
  role: 'Admin' | 'Agent';
  created_at: Date;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  static async create(email: string, hashedPassword: string, fullName: string, role: string = 'Agent'): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, fullName, role]
    );
    return result.insertId;
  }

  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  }
}
