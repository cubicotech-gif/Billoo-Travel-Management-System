import { Request, Response } from 'express';
import { QueryModel } from '../models/query.model';
import { body, validationResult } from 'express-validator';

export const createQueryValidation = [
  body('passenger_name').notEmpty().withMessage('Passenger name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('travel_type').isIn(['Umrah', 'Malaysia', 'Flight', 'Hotel', 'Other']).withMessage('Invalid travel type')
];

export const getAllQueries = async (req: Request, res: Response) => {
  try {
    const queries = await QueryModel.getAll();

    res.json({
      success: true,
      message: 'Queries retrieved successfully',
      data: queries
    });
  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queries'
    });
  }
};

export const createQuery = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { passenger_name, phone, email, travel_type } = req.body;
    const created_by = req.user?.userId;

    if (!created_by) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const queryId = await QueryModel.create({
      passenger_name,
      phone,
      email: email || '',
      travel_type,
      created_by
    });

    const newQuery = await QueryModel.findById(queryId);

    res.status(201).json({
      success: true,
      message: 'Query created successfully',
      data: newQuery
    });
  } catch (error) {
    console.error('Create query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create query'
    });
  }
};

export const getQueryById = async (req: Request, res: Response) => {
  try {
    const queryId = parseInt(req.params.id);

    if (isNaN(queryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID'
      });
    }

    const query = await QueryModel.findById(queryId);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: query
    });
  } catch (error) {
    console.error('Get query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve query'
    });
  }
};

export const updateQueryStatus = async (req: Request, res: Response) => {
  try {
    const queryId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(queryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query ID'
      });
    }

    const validStatuses = ['New', 'Working', 'Quoted', 'Finalized', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updated = await QueryModel.updateStatus(queryId, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    const updatedQuery = await QueryModel.findById(queryId);

    res.json({
      success: true,
      message: 'Query status updated successfully',
      data: updatedQuery
    });
  } catch (error) {
    console.error('Update query status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update query status'
    });
  }
};
