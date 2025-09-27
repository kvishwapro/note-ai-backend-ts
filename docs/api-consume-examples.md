# API Consumption Examples with cURL

This document provides examples of how to consume the backend API using cURL commands. These examples demonstrate how to interact with the authentication endpoints.

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
