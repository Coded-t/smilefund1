# SmileFund Backend

This is the backend server for the SmileFund React Native application.

## Tech Stack
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file in the root directory with the following content:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/smilefund
   JWT_SECRET=your_jwt_secret_key_here
   ```

3. Run the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/pin/setup` - Setup PIN
- `POST /api/auth/pin/verify` - Verify PIN

### Lessons
- `GET /api/lessons` - Get all lessons
- `GET /api/lessons/:id` - Get lesson by ID
- `POST /api/lessons` - Create a lesson (Admin)

### Goals
- `GET /api/goals` - Get user's savings goals
- `POST /api/goals` - Create a savings goal
- `PUT /api/goals/:id` - Update a savings goal

### Campaigns
- `GET /api/campaigns` - Get all donation campaigns
- `POST /api/campaigns/:id/donate` - Donate to a campaign

## Database
Ensure you have MongoDB running locally or update `MONGODB_URI` to point to your MongoDB Atlas cluster.

