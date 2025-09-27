import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { supabaseAdmin } from '../config/supabase';
import { storeMemory } from '../memory/memories';

const router = Router();

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('Missing GROQ_API_KEY');
}

const groq = new Groq({ apiKey: groqApiKey });

const INTENT_MODEL = process.env.GROQ_INTENT_MODEL || 'llama-3.1-8b-instant';
const SMALLTALK_MODEL = process.env.GROQ_SMALLTALK_MODEL || 'llama-3.1-8b-instant';

const INTENTS = {
    ADD_TASK: 'add_task',
    LIST_TASKS: 'list_tasks',
    DELETE_TASK: 'delete_task',
    REFLECT_JOURNAL: 'reflect_journal',
    SMALLTALK: 'smalltalk',
    SUMMARIES: 'summaries',
    PERFORMANCE_INSIGHTS: 'performance_insights',
    LONG_CONVERSATION_ANALYSIS: 'long_conversation_analysis',
} as const;

type Intent = (typeof INTENTS)[keyof typeof INTENTS];

interface SendMessageRequest {
    user_id: string;
    message: string;
}

interface SendMessageResponse {
    reply: string;
    optional_data?: any;
}

interface Task {
    id: number;
    user_id: string;
    content: string;
    due_date?: string;
    created_at: string;
}

interface UserProfile {
    first_name?: string;
    last_name?: string;
    email?: string;
}

// Authenticate user and get profile
async function authenticateUser(
    userId: string
): Promise<{ authenticated: boolean; profile?: UserProfile }> {
    try {
        const { data, error } = await supabaseAdmin!.auth.admin.getUserById(userId);
        if (error || !data.user) {
            return { authenticated: false };
        }
        const profile: UserProfile = {
            first_name: data.user.user_metadata?.first_name,
            last_name: data.user.user_metadata?.last_name,
            email: data.user.email,
        };
        return { authenticated: true, profile };
    } catch {
        return { authenticated: false };
    }
}

// Detect intent using Groq
async function detectIntent(message: string): Promise<Intent> {
    const prompt = `Classify the following user message into one of these intents: ${Object.values(INTENTS).join(', ')}. Return only the intent name.

Message: "${message}"`;

    const response = await groq.chat.completions.create({
        model: INTENT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0,
    });

    const intent = response.choices[0]?.message?.content?.trim().toLowerCase();
    if (Object.values(INTENTS).includes(intent as Intent)) {
        return intent as Intent;
    }
    return INTENTS.SMALLTALK; // default
}

// CRUD functions for tasks
async function addTask(userId: string, content: string, dueDate?: string): Promise<{ id: number }> {
    const { data, error } = await supabaseAdmin!
        .from('tasks')
        .insert([{ user_id: userId, content, due_date: dueDate }])
        .select('id')
        .single();

    if (error) throw new Error(`Failed to add task: ${error.message}`);
    return { id: data.id };
}

async function listTasks(userId: string): Promise<Task[]> {
    const { data, error } = await supabaseAdmin!
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list tasks: ${error.message}`);
    return data as Task[];
}

async function deleteTask(userId: string, taskId: number): Promise<void> {
    const { error } = await supabaseAdmin!
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('id', taskId);

    if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

// Journal function
async function reflectJournal(userId: string, content: string): Promise<{ id: number }> {
    const { data, error } = await supabaseAdmin!
        .from('journal_entries')
        .insert([{ user_id: userId, content }])
        .select('id')
        .single();

    if (error) throw new Error(`Failed to add journal entry: ${error.message}`);
    return { id: data.id };
}

// Generate AI reply for smalltalk
async function generateSmalltalkReply(message: string, profile?: UserProfile): Promise<string> {
    const userName = profile?.first_name ? ` ${profile.first_name}` : '';
    const prompt = `Respond naturally and helpfully as a friendly AI assistant${userName ? ` to ${userName}` : ''}: "${message}"`;

    const response = await groq.chat.completions.create({
        model: SMALLTALK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
    });

    return (
        response.choices[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response."
    );
}

// Handle complex intents (placeholder)
async function handleComplexIntent(
    intent: Intent,
    _userId: string,
    _message: string
): Promise<SendMessageResponse> {
    // TODO: Forward to Python FastAPI microservice
    return {
        reply: `Feature for ${intent} is not implemented yet.`,
        optional_data: null,
    };
}

// Main handler
async function handleMessage(
    userId: string,
    message: string,
    profile?: UserProfile
): Promise<SendMessageResponse> {
    const intent = await detectIntent(message);

    switch (intent) {
        case INTENTS.ADD_TASK: {
            // Parse task content and due date from message
            const taskMatch = message.match(/add task (.+?)(?: due (.+))?/i);
            const content = taskMatch ? taskMatch[1] : message.replace(/add task/i, '').trim();
            const dueDate = taskMatch?.[2];
            const { id } = await addTask(userId, content, dueDate);
            const reply = `Task added: "${content}"${dueDate ? ` due ${dueDate}` : ''}`;
            return { reply, optional_data: { task_id: id } };
        }
        case INTENTS.LIST_TASKS: {
            const tasks = await listTasks(userId);
            const reply = tasks.length
                ? `Here are your tasks:\n${tasks.map(t => `- ${t.content}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')}`
                : 'You have no tasks.';
            return { reply, optional_data: { tasks } };
        }
        case INTENTS.DELETE_TASK: {
            const taskMatch = message.match(/delete task (\d+)/i);
            const taskId = taskMatch ? parseInt(taskMatch[1]) : null;
            if (!taskId) {
                return { reply: 'Please specify a task ID to delete, e.g., "delete task 1"' };
            }
            await deleteTask(userId, taskId);
            return { reply: `Task ${taskId} deleted.` };
        }
        case INTENTS.REFLECT_JOURNAL: {
            const content = message.replace(/reflect journal/i, '').trim() || message;
            const { id } = await reflectJournal(userId, content);
            const reply = 'Journal entry added.';
            return { reply, optional_data: { journal_id: id } };
        }
        case INTENTS.SMALLTALK: {
            const reply = await generateSmalltalkReply(message, profile);
            return { reply };
        }
        default: {
            return await handleComplexIntent(intent, userId, message);
        }
    }
}

// POST /send-message
router.post('/send-message', async (req: Request, res: Response) => {
    try {
        const { user_id, message }: SendMessageRequest = req.body;

        if (!user_id || !message) {
            res.status(400).json({ error: 'user_id and message are required' });
            return;
        }

        // Authenticate user and get profile
        const { authenticated, profile } = await authenticateUser(user_id);
        if (!authenticated) {
            res.status(401).json({ error: 'Invalid user' });
            return;
        }

        // Handle message
        const response = await handleMessage(user_id, message, profile);

        // Store user message in vector DB
        try {
            await storeMemory(user_id, `User: ${message}`);
            await storeMemory(user_id, `AI: ${response.reply}`);
        } catch (storeError) {
            console.error('Failed to store message in vector DB:', storeError);
            // Don't fail the request if storage fails
        }

        res.json(response);
        return;
    } catch (error) {
        console.error('Error in /send-message:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});

export default router;
