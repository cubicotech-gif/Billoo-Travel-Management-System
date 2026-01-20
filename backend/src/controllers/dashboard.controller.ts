import { Request, Response } from 'express';
import { QueryModel } from '../models/query.model';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get query stats by status
    const statusStats = await QueryModel.getStatsByStatus();

    // Get total queries count
    const [totalResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM queries'
    );
    const totalQueries = totalResult[0].total;

    // Get queries created today
    const [todayResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as today FROM queries WHERE DATE(created_at) = CURDATE()'
    );
    const queriesToday = todayResult[0].today;

    // Get queries created this week
    const [weekResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as week FROM queries WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)'
    );
    const queriesThisWeek = weekResult[0].week;

    // Get recent queries (last 5)
    const recentQueries = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.full_name as creator_name
       FROM queries q
       LEFT JOIN users u ON q.created_by = u.id
       ORDER BY q.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: {
        totalQueries,
        queriesToday,
        queriesThisWeek,
        statusStats,
        recentQueries: recentQueries[0]
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats'
    });
  }
};
