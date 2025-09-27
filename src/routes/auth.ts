import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Types for request bodies
interface SignupRequest {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

interface LoginRequest {
    email: string;
    password: string;
}

// Signup endpoint
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName }: SignupRequest = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long',
            });
        }

        // Sign up user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                },
            },
        });

        if (error) {
            console.error('Signup error:', error);
            return res.status(400).json({
                error: error.message,
            });
        }

        // Check if user was created successfully
        if (data.user && !data.session) {
            // Email confirmation required
            return res.status(201).json({
                message:
                    'User created successfully. Please check your email to confirm your account.',
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    email_confirmed: false,
                },
            });
        }

        if (data.user && data.session) {
            // User created and logged in (email confirmation disabled)
            return res.status(201).json({
                message: 'User created and logged in successfully',
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    email_confirmed: data.user.email_confirmed_at ? true : false,
                },
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at,
                },
            });
        }

        return res.status(500).json({
            error: 'Unexpected response from authentication service',
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            error: 'Internal server error',
        });
    }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password }: LoginRequest = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
            });
        }

        // Sign in user with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Login error:', error);
            return res.status(401).json({
                error: 'Invalid email or password',
            });
        }

        if (data.user && data.session) {
            return res.status(200).json({
                message: 'Login successful',
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    email_confirmed: data.user.email_confirmed_at ? true : false,
                    first_name: data.user.user_metadata?.first_name,
                    last_name: data.user.user_metadata?.last_name,
                },
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at,
                },
            });
        }

        return res.status(500).json({
            error: 'Unexpected response from authentication service',
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Internal server error',
        });
    }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Logout error:', error);
            return res.status(500).json({
                error: 'Error signing out',
            });
        }

        return res.status(200).json({
            message: 'Logout successful',
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            error: 'Internal server error',
        });
    }
});

// Get current user endpoint
router.get('/me', async (req: Request, res: Response) => {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            console.error('Get user error:', error);
            return res.status(401).json({
                error: 'Not authenticated',
            });
        }

        if (!user) {
            return res.status(401).json({
                error: 'Not authenticated',
            });
        }

        return res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                email_confirmed: user.email_confirmed_at ? true : false,
                first_name: user.user_metadata?.first_name,
                last_name: user.user_metadata?.last_name,
                created_at: user.created_at,
                updated_at: user.updated_at,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            error: 'Internal server error',
        });
    }
});

export default router;
