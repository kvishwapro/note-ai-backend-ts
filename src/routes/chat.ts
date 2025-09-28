import { Router, Request, Response } from 'express';
import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { supabaseAdmin } from '../config/supabase';
import { storeMemory } from '../memory/memories';

const router = Router();

const INTENT_MODEL = process.env.OLLAMA_INTENT_MODEL || 'llama3.2:latest';
const SMALLTALK_MODEL = process.env.OLLAMA_SMALLTALK_MODEL || 'llama3.2:latest';

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

// Detect intent using Ollama with Zod
async function detectIntent(message: string): Promise<Intent> {
    const intentSchema = z.object({
        intent: z.enum(Object.values(INTENTS) as [string, ...string[]]),
    });

    const schema = zodToJsonSchema(intentSchema);

    const systemContent = `Classify the following user message into one of these intents: ${Object.values(INTENTS).join(', ')}. Your response MUST be a JSON object that adheres to the provided schema.`;

    const response = await ollama.chat({
        model: INTENT_MODEL,
        messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: message },
        ],
        format: schema as any,
    });

    const content = response.message.content;
    if (!content) return INTENTS.SMALLTALK;

    try {
        const parsedContent = JSON.parse(content);
        const validated = intentSchema.safeParse(parsedContent);
        if (validated.success) {
            return validated.data.intent as Intent;
        } else {
            console.error('Zod validation failed for intent detection:', validated.error);
        }
    } catch (error) {
        console.error('Failed to parse JSON from Ollama for intent detection:', error);
    }
    return INTENTS.SMALLTALK; // default
}

// Extract parameters using Groq
export async function extractParameters(
    intent: Intent,
    message: string
): Promise<Record<string, any>> {
    let zodSchema: z.ZodObject<any>;
    let systemContent = '';

    switch (intent) {
        case INTENTS.ADD_TASK: {
            zodSchema = z.object({
                content: z.string(),
                due_date: z.string().optional(),
            });
            systemContent =
                'Extract the task content and optional due date from the message. Your response MUST be a JSON object that adheres to the provided schema.';
            break;
        }
        case INTENTS.DELETE_TASK: {
            zodSchema = z.object({
                task_id: z.number(),
            });
            systemContent =
                'Extract the task ID to delete from the message. Your response MUST be a JSON object that adheres to the provided schema.';
            break;
        }
        case INTENTS.REFLECT_JOURNAL: {
            zodSchema = z.object({
                content: z.string(),
            });
            systemContent =
                'Extract the journal content from the message. Your response MUST be a JSON object that adheres to the provided schema.';
            break;
        }
        default:
            return {};
    }

    const schema = zodToJsonSchema(zodSchema);

    const response = await ollama.chat({
        model: INTENT_MODEL,
        messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: message },
        ],
        format: schema as any,
    });

    const content = response.message.content;
    if (!content) return {};
    try {
        const parsedContent = JSON.parse(content);
        const validated = zodSchema.safeParse(parsedContent);
        if (validated.success) {
            return validated.data;
        } else {
            console.error(
                `Zod validation failed for ${intent} parameter extraction:`,
                validated.error
            );
        }
    } catch (error) {
        console.error(
            `Failed to parse JSON from Ollama for ${intent} parameter extraction:`,
            error
        );
    }
    return {};
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
    const prompt = `Respond naturally and helpfully as a friendly AI assistant in very very less words ${userName ? ` to ${userName}` : ''}: "${message}"`;

    const response = await ollama.chat({
        model: SMALLTALK_MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.message.content?.trim() || "Sorry, I couldn't generate a response.";
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
    console.log(`Detected intent: ${intent}`);
    const params = await extractParameters(intent, message);

    switch (intent) {
        case INTENTS.ADD_TASK: {
            const { content, due_date } = params;
            const taskContent = content || message.replace(/add task/i, '').trim();
            const { id } = await addTask(userId, taskContent, due_date);
            const reply = `Task added: "${taskContent}"${due_date ? ` due ${due_date}` : ''}`;
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
            const { task_id } = params;
            if (!task_id) {
                return { reply: 'Please specify a task ID to delete, e.g., "delete task 1"' };
            }
            await deleteTask(userId, task_id);
            return { reply: `Task ${task_id} deleted.` };
        }
        case INTENTS.REFLECT_JOURNAL: {
            const { content } = params;
            const journalContent = content || message;
            const { id } = await reflectJournal(userId, journalContent);
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

export { detectIntent, INTENTS };
export default router;
