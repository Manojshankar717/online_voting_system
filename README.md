# Online Voting System

A secure and scalable online voting platform built with Node.js, Express, and MySQL. This system enables electronic voting with robust security measures, admin controls, and real-time election management.

## Features

- **User Authentication**: Secure registration and login with OTP verification
- **Election Management**: Create, start, and stop elections with candidate management
- **Voting System**: Real-time voting with secure vote casting
- **Admin Dashboard**: Comprehensive admin panel for election oversight
- **Rate Limiting**: Protection against abuse and spam
- **Security**: Helmet.js protection, CORS configuration, and JWT authentication
- **Database**: MySQL integration with secure connections
- **Audit Trail**: Logging of critical system events
- **Scheduler**: Automated election start/stop scheduling
- **Demo Mode**: Development/testing environment support

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MySQL
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: bcrypt, helmet, rate limiting
- **Validation**: Joi for request validation
- **Frontend**: React (in client directory)
- **Scheduling**: node-cron for automated tasks
- **Email**: Nodemailer for OTP delivery

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd online_voting_system
```

2. Install backend dependencies:
```bash
npm install
```

3. Navigate to the client directory and install frontend dependencies:
```bash
cd client
npm install
```

4. Return to the root directory:
```bash
cd ..
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
OTP_SECRET=your_otp_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
DEMO_MODE=false
```

## Database Setup

1. Make sure you have MySQL installed and running
2. Create a database for the application
3. Execute the SQL script in `scripts/init.sql` to initialize tables:
```bash
mysql -u your_username -p your_database_name < scripts/init.sql
```

## Running the Application

### Development Mode

Start the backend server:
```bash
npm run dev
```

In a separate terminal, start the frontend (from client directory):
```bash
cd client
npm start
```

### Production Mode

Build the frontend and start the backend:
```bash
cd client && npm run build
cd ..
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/request-otp` - Request OTP for verification
- `POST /api/auth/verify-otp` - Verify OTP

### Election Routes (`/api/elections`)
- `GET /api/elections` - Get all active elections
- `GET /api/elections/:id` - Get specific election details
- `POST /api/elections/:id/vote` - Cast vote in election (requires authentication)

### Admin Routes (`/api/admin`)
- `POST /api/admin/elections` - Create new election (admin only)
- `GET /api/admin/elections` - Get all elections (admin only)
- `POST /api/admin/elections/:electionId/start` - Start an election (admin only)
- `POST /api/admin/elections/:electionId/stop` - Stop an election (admin only)
- `POST /api/admin/elections/:electionId/candidates` - Add candidate to election (admin only)
- `GET /api/admin/stats` - Get admin statistics (admin only)
- `GET /api/admin/audit` - Get audit logs (admin only)

### Other Endpoints
- `GET /health` - Health check endpoint
- `POST /api/refresh-token` - Refresh authentication token

## Security Features

- Password hashing with bcrypt
- JWT-based authentication with refresh tokens
- Rate limiting to prevent brute-force attacks
- Input validation with Joi
- Helmet.js for HTTP header security
- CORS configured for secure cross-origin requests
- OTP verification for enhanced security

## Project Structure

```
online_voting_system/
├── client/                 # Frontend React application
├── scripts/
│   └── init.sql          # Database initialization script
├── src/
│   ├── controllers/      # Request handlers
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   └── registrationController.js
│   ├── middlewares/      # Custom middleware functions
│   │   ├── rateLimiter.js
│   │   ├── requireAdmin.js
│   │   ├── requireAuth.js
│   │   └── validation.js
│   ├── routes/           # Route definitions
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── elections.js
│   │   └── index.js
│   ├── utils/            # Utility functions
│   │   ├── db.js         # Database connection
│   │   ├── demoStore.js  # Demo data
│   │   ├── otp.js        # OTP generation/handling
│   │   └── scheduler.js  # Scheduled tasks
│   └── index.js          # Main server entry point
├── .env                  # Environment variables
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

If you encounter any issues or have questions, please open an issue in the repository.