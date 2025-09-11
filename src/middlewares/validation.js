import { z } from 'zod';

// Auth validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email format')
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

// Election validation schemas
const createElectionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['single_choice', 'multiple_choice', 'ranked_choice', 'approval_voting'], {
    errorMap: () => ({ message: 'Invalid election type' })
  }),
  max_selections: z.number().int().positive().optional(),
  starts_at: z.string().datetime('Invalid start date format').optional(),
  ends_at: z.string().datetime('Invalid end date format').optional(),
  status: z.enum(['draft','active','scheduled','completed']).optional()
});

const addCandidateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  party: z.string().min(2, 'Party must be at least 2 characters').optional().or(z.literal('')),
  manifesto: z.string().optional().or(z.literal(''))
});

const castVoteSchema = z.object({
  votes: z.array(z.object({
    candidateId: z.number().int().positive('Invalid candidate ID'),
    ranking: z.number().int().positive().optional(),
    approved: z.boolean().optional()
  })).min(1, 'At least one vote is required')
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = Array.isArray(error.issues) ? error.issues : []
        return res.status(400).json({
          error: 'Validation failed',
          details: issues.length > 0 ? issues.map(err => ({
            field: Array.isArray(err.path) ? err.path.join('.') : '',
            message: err.message
          })) : ['Invalid input data']
        });
      }
      next(error);
    }
  };
};

export {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  createElectionSchema,
  addCandidateSchema,
  castVoteSchema,
  validate
};
