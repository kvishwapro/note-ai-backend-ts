# Note AI Backend

A Node.js + TypeScript backend with Supabase integration for a note-taking application.

## Features

- 🚀 Express.js server with TypeScript
- 🔒 Supabase integration for database operations
- 🛡️ Security middleware (Helmet, CORS)
- 📝 Comprehensive error handling
- 🔧 Environment-based configuration
- 📊 Health check endpoint
- 🎯 Sample CRUD API routes for notes

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd note-ai-backend
npm install
```

### 2. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Go to Settings > API
3. Copy your project URL and API keys
4. Update the `.env` file with your Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. Database Schema

Create a `notes` table in your Supabase project:

```sql
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notes
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own notes
CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid()::text = user_id);
```

### 4. Environment Configuration

Copy the example environment file and update it:

```bash
cp .env.example .env
```

Update the `.env` file with your actual values.

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start the server with hot reload using nodemon.

### Production Mode

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-09-26T16:29:28.135Z",
  "environment": "development"
}
```

### Authentication API

#### User Signup

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### User Logout

```http
POST /api/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

## Project Structure

```
note-ai-backend/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Supabase client configuration
│   ├── middleware/
│   │   ├── errorHandler.ts      # Error handling middleware
│   │   └── notFoundHandler.ts   # 404 handler
│   ├── routes/
│   │   └── notes.ts             # Notes API routes
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   └── index.ts                 # Main server file
├── dist/                        # Compiled JavaScript files
├── .env                         # Environment variables
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (placeholder)

## Security Features

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Error handling without exposing sensitive information
- Environment-based configuration

## Development Guidelines

1. Always use TypeScript for type safety
2. Follow the existing project structure
3. Add proper error handling for all routes
4. Use environment variables for configuration
5. Add JSDoc comments for functions
6. Keep routes modular and organized

## Next Steps

1. Implement authentication (JWT)
2. Add user management
3. Implement file upload for notes
4. Add search functionality
5. Implement pagination
6. Add rate limiting
7. Set up testing
8. Add API documentation (Swagger/OpenAPI)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC