import { z } from 'zod';

export const RESPONSE_FORMAT = {
    create_task: z.object({
        ai_summary: z.string(),
        task_id: z.number(),
        task_title: z.string(),
        task_status: z.string(),
        task_duration_minutes: z.number().nullable(),
        task_priority: z.string().nullable(),
        task_labels: z.array(z.string()).nullable(),
        task_due_date: z.string().nullable(),
    }),
    list_tasks: z.object({
        ai_summary: z.string(),
        tasks: z.array(
            z.object({
                id: z.number(),
                title: z.string(),
                status: z.string(),
                duration_minutes: z.number().nullable(),
                priority: z.string().nullable(),
                labels: z.array(z.string()).nullable(),
                due_date: z.string().nullable(),
            })
        ),
        count: z.number(),
    }),
    update_task: z.object({
        ai_summary: z.string(),
        task_id: z.number(),
        task_title: z.string(),
        task_status: z.string(),
        task_duration_minutes: z.number().nullable(),
        task_priority: z.string().nullable(),
        task_labels: z.array(z.string()).nullable(),
        task_due_date: z.string().nullable(),
    }),
    delete_task: z.object({
        ai_summary: z.string(),
        task_id: z.number(),
    }),
    schedule_tasks_to_calendar: z.object({
        ai_summary: z.string(),
        scheduled_count: z.number(),
        blocks: z.array(z.any()),
    }),
    reschedule_tasks: z.object({
        ai_summary: z.string(),
        rescheduled_count: z.number(),
        conflicts_resolved: z.number(),
    }),
    check_deadline_risks: z.object({
        ai_summary: z.string(),
        risks: z.array(
            z.object({
                task_id: z.number(),
                task_title: z.string(),
                due_date: z.string(),
                days_until_due: z.number(),
                at_risk: z.boolean(),
                overdue: z.boolean(),
            })
        ),
        total_at_risk: z.number(),
    }),
    calculate_priority_score: z.object({
        ai_summary: z.string(),
        task_id: z.string(),
        total_score: z.number(),
        breakdown: z.object({
            impact: z.number(),
            urgency: z.number(),
            effort: z.number(),
            risk: z.number(),
        }),
        explanation: z.string(),
    }),
    bulk_update_tasks: z.object({
        ai_summary: z.string(),
        success_count: z.number(),
        failed_count: z.number(),
        errors: z.array(z.string()),
    }),
    generate_task_brief: z.object({
        ai_summary: z.string(),
        summary: z.string(),
        acceptance_criteria: z.array(z.string()).optional(),
        subtasks: z.array(z.string()).optional(),
    }),
    undo_last_action: z.object({
        ai_summary: z.string(),
        undone: z.boolean(),
        action_id: z.string().nullable(),
    }),
    ask_clarification: z.object({
        ai_summary: z.string(),
        needs_clarification: z.boolean(),
        missing_fields: z.array(z.string()),
        context: z.string(),
        suggestions: z.array(z.string()).nullable(),
    }),
};
