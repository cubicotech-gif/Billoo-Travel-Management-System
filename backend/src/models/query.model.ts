import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface Query {
  id: number;
  query_number: string;
  passenger_name: string;
  phone: string;
  email: string;
  travel_type: 'Umrah' | 'Malaysia' | 'Flight' | 'Hotel' | 'Other';
  status: 'New' | 'Working' | 'Quoted' | 'Finalized' | 'Cancelled';
  created_by: number;
  created_at: Date;
  creator_name?: string;
}

export class QueryModel {
  static async getAll(): Promise<Query[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.full_name as creator_name
       FROM queries q
       LEFT JOIN users u ON q.created_by = u.id
       ORDER BY q.created_at DESC`
    );
    return rows as Query[];
  }

  static async create(data: {
    passenger_name: string;
    phone: string;
    email: string;
    travel_type: string;
    created_by: number;
  }): Promise<number> {
    // Generate query number (format: QRY-YYYYMMDD-XXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of queries today
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM queries WHERE DATE(created_at) = CURDATE()'
    );
    const count = countRows[0].count + 1;
    const queryNumber = `QRY-${dateStr}-${String(count).padStart(3, '0')}`;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO queries (query_number, passenger_name, phone, email, travel_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [queryNumber, data.passenger_name, data.phone, data.email, data.travel_type, data.created_by]
    );
    return result.insertId;
  }

  static async findById(id: number): Promise<Query | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.full_name as creator_name
       FROM queries q
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.id = ?`,
      [id]
    );
    return rows.length > 0 ? (rows[0] as Query) : null;
  }

  static async updateStatus(id: number, status: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE queries SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  static async getStatsByStatus(): Promise<{ status: string; count: number }[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT status, COUNT(*) as count FROM queries GROUP BY status'
    );
    return rows as { status: string; count: number }[];
  }
}
