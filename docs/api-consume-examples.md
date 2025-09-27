# API Consumption Examples with cURL

This document provides examples of how to consume the backend API using cURL commands. These examples demonstrate how to interact with the authentication and chat endpoints.

## Health Check Endpoint

Get the server health status.

```bash
curl -X GET http://localhost:3000/health
```

**Response:**

```json
{
    "status": "OK",
    "timestamp": "2025-09-26T16:29:28.135Z",
    "environment": "development"
}
```

## Authentication Endpoints

### 1. User Signup

Create a new user account.

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response (Success):**

```json
{
    "message": "User created successfully. Please check your email to confirm your account.",
    "user": {
        "id": "user-id-here",
        "email": "user@example.com",
        "email_confirmed": false
    }
}
```

**Response (Error):**

```json
{
    "error": "Email and password are required"
}
```

### 2. User Login

Authenticate an existing user.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

**Response (Success):**

```json
{
    "message": "Login successful",
    "user": {
        "id": "user-id-here",
        "email": "user@example.com",
        "email_confirmed": true,
        "first_name": "John",
        "last_name": "Doe"
    },
    "session": {
        "access_token": "access-token-here",
        "refresh_token": "refresh-token-here",
        "expires_at": 1634567890
    }
}
```

**Response (Error):**

```json
{
    "error": "Invalid email or password"
}
```

### 3. User Logout

End the current user session.

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success):**

```json
{
    "message": "Logout successful"
}
```

**Response (Error):**

```json
{
    "error": "Error signing out"
}
```

### 4. Get Current User

Retrieve information about the currently authenticated user.

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success):**

```json
{
    "user": {
        "id": "user-id-here",
        "email": "user@example.com",
        "email_confirmed": true,
        "first_name": "John",
        "last_name": "Doe",
        "created_at": "2025-09-26T10:00:00.000Z",
        "updated_at": "2025-09-26T10:00:00.000Z"
    }
}
```

**Response (Error):**

```json
{
    "error": "Not authenticated"
}
```

## Chat Endpoints

### Send Message

Send a chat message to the AI assistant. The endpoint processes the message, detects intent, and responds accordingly. Supports task management, journaling, and general conversation.

**Authentication**: Uses `user_id` (no token required, validates user exists in Supabase)

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id-here",
    "message": "Add a task to buy groceries"
  }'
```

**Response (Success - Add Task):**

```json
{
    "reply": "Task added: \"buy groceries\"",
    "optional_data": {
        "task_id": 123
    }
}
```

**Response (Success - List Tasks):**

```json
{
    "reply": "Here are your tasks:\n- buy groceries\n- finish project (due 2025-09-30)",
    "optional_data": {
        "tasks": [
            {
                "id": 123,
                "user_id": "user-id-here",
                "content": "buy groceries",
                "due_date": null,
                "created_at": "2025-09-27T06:00:00.000Z"
            }
        ]
    }
}
```

**Response (Success - Smalltalk):**

```json
{
    "reply": "Hello! I'm your AI assistant. How can I help you today?"
}
```

**Response (Error - Invalid User):**

```json
{
    "error": "Invalid user"
}
```

**Response (Error - Missing Fields):**

```json
{
    "error": "user_id and message are required"
}
```

### Supported Intents

The AI automatically detects and handles these intents:

- **add_task**: "Add a task to buy milk" or "Create task: finish homework due tomorrow"
- **list_tasks**: "Show my tasks" or "What are my pending tasks?"
- **delete_task**: "Delete task 1" or "Remove the task about groceries"
- **reflect_journal**: "Journal: Today was productive" or "Reflect on my day"
- **smalltalk**: General conversation like "Hello" or "How are you?"
- **summaries**: "Summarize my week" (placeholder - not implemented)
- **performance_insights**: "Show my productivity insights" (placeholder - not implemented)
- **long_conversation_analysis**: "Analyze my conversation patterns" (placeholder - not implemented)

### Notes

- Messages are stored in the vector database for context
- User profiles are retrieved for personalized responses
- Complex intents forward to external services (currently placeholders)

## Common Headers

For authenticated requests, include the Authorization header with your access token:

```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Error Handling

All API endpoints return standardized error responses:

```json
{
    "error": "Error message here"
}
```

## Environment Variables

Make sure to set the following environment variables in your `.env` file:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `GROQ_API_KEY` - Your Groq API key for AI processing
- `GROQ_INTENT_MODEL` - Groq model for intent detection (optional, defaults to llama-3.1-8b-instant)
- `GROQ_SMALLTALK_MODEL` - Groq model for chat responses (optional, defaults to llama-3.1-8b-instant)
