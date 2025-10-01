import OpenAI from 'openai';
import { supabaseAdmin } from '../config/supabase';
import { getRecentMessages } from '../memory/memories';
import { AI_TOOLS } from '../config/tools';

interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

// Initialize OpenAI client to use Ollama
const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY, // required but ignored by Ollama
});

const INTENT_MODEL = process.env.OLLAMA_INTENT_MODEL || 'openai/gpt-oss-20b';

export interface SendMessageResponse {
    reply: string;
    optional_data?: any;
}

interface Task {
    id: number;
    user_id: string;
    content: string;
    due_date?: string;
    priority?: string;
    status?: string;
    labels?: string[];
    duration_minutes?: number;
    notes?: string;
    created_at: string;
}

interface UserProfile {
    first_name?: string;
    last_name?: string;
    email?: string;
}

// Authenticate user and get profile
export async function authenticateUser(
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

// CRUD functions for tasks
async function addTask(
    userId: string,
    title: string,
    dueDate?: string,
    priority?: string,
    labels?: string[],
    durationMinutes?: number,
    notes?: string
): Promise<{ id: number }> {
    const taskData: Record<string, any> = {
        user_id: userId,
        content: title,
        status: 'open',
    };

    // Only add fields if they have values
    if (dueDate) taskData.due_date = dueDate;
    if (priority) taskData.priority = priority;
    if (labels) taskData.labels = labels;
    if (durationMinutes !== undefined) taskData.duration_minutes = durationMinutes;
    if (notes) taskData.notes = notes;

    const { data, error } = await supabaseAdmin!
        .from('tasks')
        .insert([taskData])
        .select('id')
        .single();

    if (error) throw new Error(`Failed to add task: ${error.message}`);
    return { id: data.id };
}

async function deleteTask(userId: string, taskId: number): Promise<void> {
    const { error } = await supabaseAdmin!
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('id', taskId);

    if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

async function updateTask(
    userId: string,
    taskIdentifier: string | number,
    updates: Record<string, any>
): Promise<void> {
    // Clean up updates object - map fields to DB columns
    const dbUpdates: Record<string, any> = {};
    if (updates.title) dbUpdates.content = updates.title;
    if (updates.due) dbUpdates.due_date = updates.due;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.labels) dbUpdates.labels = updates.labels;
    if (updates.duration_minutes) dbUpdates.duration_minutes = updates.duration_minutes;
    if (updates.notes) dbUpdates.notes = updates.notes;
    if (updates.status) dbUpdates.status = updates.status;

    const { error } = await supabaseAdmin!
        .from('tasks')
        .update(dbUpdates)
        .eq('user_id', userId)
        .eq('id', taskIdentifier);

    if (error) throw new Error(`Failed to update task: ${error.message}`);
}

async function listTasksWithFilters(
    userId: string,
    filter: any = {},
    sort: string = 'due_asc'
): Promise<Task[]> {
    let query = supabaseAdmin!.from('tasks').select('*').eq('user_id', userId);

    // Apply filters
    if (filter?.priority_at_least) {
        query = query.gte('priority', filter.priority_at_least);
    }
    if (filter?.due_before) {
        query = query.lte('due_date', filter.due_before);
    }
    if (filter?.due_after) {
        query = query.gte('due_date', filter.due_after);
    }
    if (filter?.status) {
        query = query.eq('status', filter.status);
    }
    if (filter?.labels_any && filter.labels_any.length > 0) {
        query = query.overlaps('labels', filter.labels_any);
    }

    // Apply sorting
    if (sort) {
        const [field, order] = sort.split('_');
        const dbField = field === 'due' ? 'due_date' : field;
        query = query.order(dbField, { ascending: order === 'asc' });
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list tasks: ${error.message}`);
    return (data as Task[]) || [];
}

async function scheduleTasksToCalendar(userId: string, params: any): Promise<any> {
    // Placeholder implementation
    return {
        scheduled: params.task_ids?.length || 0,
        blocks: [],
        message: 'Calendar scheduling not yet implemented',
    };
}

async function rescheduleTasks(userId: string, params: any): Promise<any> {
    // Placeholder implementation
    return {
        rescheduled: params.task_ids?.length || 0,
        conflicts_resolved: 0,
        message: 'Rescheduling not yet implemented',
    };
}

async function checkDeadlineRisks(userId: string, params: any): Promise<any> {
    const taskIds = params.task_ids || null;
    const thresholdDays = params.threshold_days || 7;

    let query = supabaseAdmin!
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .not('due_date', 'is', null);

    if (taskIds && taskIds.length > 0) {
        query = query.in('id', taskIds);
    }

    const { data: tasks, error } = await query;
    if (error) throw new Error(`Failed to check deadline risks: ${error.message}`);

    const now = new Date();
    const risks = (tasks || [])
        .map((task: Task) => {
            const dueDate = new Date(task.due_date!);
            const daysUntilDue = Math.ceil(
                (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                task_id: task.id,
                task_title: task.content,
                due_date: task.due_date,
                days_until_due: daysUntilDue,
                at_risk: daysUntilDue <= thresholdDays && daysUntilDue >= 0,
                overdue: daysUntilDue < 0,
            };
        })
        .filter(r => r.at_risk || r.overdue);

    return { risks, total_at_risk: risks.length };
}

async function calculatePriorityScore(userId: string, taskId: string, weights?: any): Promise<any> {
    const { data: task, error } = await supabaseAdmin!
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('id', taskId)
        .single();

    if (error) throw new Error(`Failed to get task: ${error.message}`);

    // Default weights
    const w = weights || { impact: 0.3, urgency: 0.3, effort: 0.2, risk: 0.2 };

    // Simple scoring algorithm (placeholder)
    const priorityMap: Record<string, number> = { P0: 100, P1: 75, P2: 50, P3: 25 };
    const baseScore = priorityMap[task.priority] || 50;

    const score = {
        total: baseScore,
        breakdown: {
            impact: baseScore * w.impact,
            urgency: baseScore * w.urgency,
            effort: baseScore * w.effort,
            risk: baseScore * w.risk,
        },
        explanation: `Task scored ${baseScore} based on priority ${task.priority}`,
    };

    return score;
}

async function bulkUpdateTasks(userId: string, params: any): Promise<any> {
    const { task_ids, operation, params: opParams } = params;

    if (!task_ids || task_ids.length === 0) {
        throw new Error('No task IDs provided');
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const taskId of task_ids) {
        try {
            switch (operation) {
                case 'reassign':
                    // Placeholder - would need assignee field
                    break;
                case 'relabel':
                    if (opParams?.labels_add) {
                        const { data: task } = await supabaseAdmin!
                            .from('tasks')
                            .select('labels')
                            .eq('id', taskId)
                            .eq('user_id', userId)
                            .single();

                        const currentLabels = task?.labels || [];
                        const newLabels = Array.from(
                            new Set([...currentLabels, ...(opParams.labels_add || [])])
                        );

                        await updateTask(userId, taskId, { labels: newLabels });
                    }
                    break;
                case 'reschedule':
                    if (opParams?.reschedule_offset_days) {
                        // Implement date offset logic
                    }
                    break;
                case 'archive':
                    await updateTask(userId, taskId, { status: 'archived' });
                    break;
                case 'delete':
                    await deleteTask(userId, taskId);
                    break;
            }
            results.success++;
        } catch (err: any) {
            results.failed++;
            results.errors.push(`Task ${taskId}: ${err.message}`);
        }
    }

    return results;
}

async function generateTaskBrief(input: string, options: any): Promise<any> {
    const completion = await client.chat.completions.create({
        model: INTENT_MODEL,
        messages: [
            {
                role: 'system',
                content:
                    'Generate a detailed task brief with summary, acceptance criteria, and subtasks from the user input. Return as JSON.',
            },
            { role: 'user', content: input },
        ],
        temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';

    return {
        summary: content,
        acceptance_criteria: options.generate_acceptance_criteria
            ? ['Criteria 1', 'Criteria 2']
            : undefined,
        subtasks: options.generate_subtasks ? ['Subtask 1', 'Subtask 2'] : undefined,
    };
}

async function undoLastAction(userId: string, actionId?: string): Promise<any> {
    // Placeholder - would need audit_log table
    return {
        undone: false,
        message: 'Undo functionality requires audit_log table setup',
        action_id: actionId,
    };
}

// async function getAuditLog(userId: string, filters: any): Promise<any> {
//     // Placeholder - would need audit_log table
//     return {
//         logs: [],
//         total: 0,
//         message: 'Audit log requires audit_log table setup',
//     };
// }

// Tool execution handler
async function executeToolCall(
    toolCall: ToolCall,
    userId: string
): Promise<{ tool_call_id: string; output: any }> {
    const functionName = toolCall.function.name;

    // Parse and clean arguments - remove null values
    const rawArgs = JSON.parse(toolCall.function.arguments);
    const args: Record<string, any> = {};

    // Only include non-null, non-undefined values
    for (const [key, value] of Object.entries(rawArgs)) {
        if (value !== null && value !== undefined) {
            args[key] = value;
        }
    }

    try {
        switch (functionName) {
            case 'create_task': {
                const { id } = await addTask(
                    userId,
                    args.title,
                    args.due,
                    args.priority,
                    args.labels,
                    args.duration_minutes,
                    args.notes
                );
                return {
                    tool_call_id: toolCall.id,
                    output: {
                        success: true,
                        task_id: id,
                        message: `Task "${args.title}" created successfully`,
                    },
                };
            }

            case 'update_task': {
                await updateTask(userId, args.task_id || args.fuzzy_key, args.set);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, message: 'Task updated successfully' },
                };
            }

            case 'list_tasks': {
                const tasks = await listTasksWithFilters(userId, args.filter, args.sort);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, tasks, count: tasks.length },
                };
            }

            case 'schedule_tasks_to_calendar': {
                const schedule = await scheduleTasksToCalendar(userId, args);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, schedule, preview_only: args.preview_only },
                };
            }

            case 'reschedule_tasks': {
                const newSchedule = await rescheduleTasks(userId, args);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, new_schedule: newSchedule },
                };
            }

            case 'check_deadline_risks': {
                const risks = await checkDeadlineRisks(userId, args);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, risks },
                };
            }

            case 'calculate_priority_score': {
                const score = await calculatePriorityScore(userId, args.task_id, args.weights);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, score, explanation: score.explanation },
                };
            }

            case 'bulk_update_tasks': {
                const results = await bulkUpdateTasks(userId, args);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, results },
                };
            }

            case 'generate_task_brief': {
                const brief = await generateTaskBrief(args.short_input, args);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, brief },
                };
            }

            case 'undo_last_action': {
                const undone = await undoLastAction(userId, args.action_id);
                return {
                    tool_call_id: toolCall.id,
                    output: { success: true, undone },
                };
            }

            // case 'get_audit_log': {
            //     const logs = await getAuditLog(userId, args);
            //     return {
            //         tool_call_id: toolCall.id,
            //         output: { success: true, logs },
            //     };
            // }

            case 'ask_clarification': {
                return {
                    tool_call_id: toolCall.id,
                    output: {
                        success: true,
                        needs_clarification: true,
                        missing_fields: args.missing_fields,
                        context: args.context,
                        suggestions: args.suggestions,
                    },
                };
            }

            default:
                return {
                    tool_call_id: toolCall.id,
                    output: { success: false, error: 'Unknown tool' },
                };
        }
    } catch (error: any) {
        console.error(`Error executing tool ${functionName}:`, error);
        return {
            tool_call_id: toolCall.id,
            output: { success: false, error: error.message },
        };
    }
}

// Main handler
export async function handleMessage(
    userId: string,
    message: string,
    profile?: UserProfile
): Promise<SendMessageResponse> {
    // Get conversation history for context (last 30 messages)
    const conversationHistory = await getRecentMessages(userId, 30);

    const userName = profile?.first_name ? ` ${profile.first_name}` : '';

    // Build messages array with conversation history
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: `You are a helpful daily planner assistant${userName ? ` for ${userName}` : ''}. Use the available tools to help users manage tasks, schedules, and journals. Current date: ${new Date().toISOString()}. Be concise and friendly.`,
        },
        ...conversationHistory.map(msg => ({
            role: msg.role === 'ai' ? ('assistant' as const) : ('user' as const),
            content: msg.content,
        })),
        {
            role: 'user',
            content: message,
        },
    ];

    try {
        // Call Ollama with tools
        const completion = await client.chat.completions.create({
            model: INTENT_MODEL,
            messages,
            tools: AI_TOOLS,
            tool_choice: 'auto',
            temperature: 0,
        });

        const responseMessage = completion.choices[0]?.message;

        // Check if the model wants to call tools
        if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
            // Execute all tool calls
            const toolResults = await Promise.all(
                responseMessage.tool_calls.map(async (toolCall: any) => {
                    return await executeToolCall(toolCall as ToolCall, userId);
                })
            );

            // Add assistant message with tool calls to history
            messages.push(responseMessage as OpenAI.Chat.Completions.ChatCompletionMessageParam);

            // Add tool results to messages
            toolResults.forEach(result => {
                messages.push({
                    role: 'tool',
                    tool_call_id: result.tool_call_id,
                    content: JSON.stringify(result.output),
                });
            });

            // Get final response from model
            const finalCompletion = await client.chat.completions.create({
                model: INTENT_MODEL,
                messages,
                temperature: 0.7,
            });

            return {
                reply: finalCompletion.choices[0]?.message?.content || 'Action completed.',
                optional_data: { tool_results: toolResults },
            };
        } else {
            // No tool calls, treat as smalltalk
            return {
                reply: responseMessage?.content || "Sorry, I couldn't generate a response.",
            };
        }
    } catch (error: any) {
        console.error('Error in handleMessage:', error);
        return { reply: 'Sorry, I encountered an error processing your request.' };
    }
}

export async function handleLoadMessage(userId: string): Promise<SendMessageResponse> {
    const { data: messages, error } = await supabaseAdmin!
        .from('memories')
        .select('id, content, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(100);

    if (error) {
        throw new Error(`Failed to load messages: ${error.message}`);
    }

    return {
        reply: 'Loaded past messages.',
        optional_data: { messages },
    };
}
