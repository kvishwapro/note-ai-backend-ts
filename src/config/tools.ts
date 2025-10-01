interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        // strict?: boolean;
        parameters: {
            type: 'object';
            properties: Record<string, JSONSchemaProperty>;
            required: string[];
            additionalProperties?: boolean;
        };
    };
}

interface JSONSchemaProperty {
    type: string | string[];
    description?: string;
    enum?: (string | null)[];
    format?: string;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    items?: JSONSchemaProperty;
    properties?: Record<string, JSONSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
    default?: unknown;
}

type ToolsArray = Tool[];

export const AI_TOOLS: ToolsArray = [
    {
        type: 'function',
        function: {
            name: 'create_task',
            description:
                'Create a task from natural language. Use when the user describes a new todo.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    title: { type: 'string', description: 'Concise task title' },
                    due: {
                        type: ['string', 'null'],
                        description:
                            'ISO8601 date or date-time (e.g., "2025-10-01" or "2025-10-01T10:00:00Z"); null if not provided',
                    },
                    priority: {
                        type: ['string', 'null'],
                        enum: ['P0', 'P1', 'P2', 'P3', null],
                        description:
                            'P0 highest; default P2. Always suggest a priority level to the user if not provided.',
                    },
                    labels: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                        description: "Tags like 'work', 'personal'; null if not provided",
                    },
                    duration_minutes: {
                        type: ['integer', 'null'],
                        minimum: 5,
                        maximum: 1440,
                        description:
                            'Estimated effort in minutes (5-1440). Always ask the user for an estimated duration if not provided.',
                    },
                    notes: { type: ['string', 'null'], description: 'Additional details' },
                    source_text: {
                        type: ['string', 'null'],
                        description: 'Original user input for audit',
                    },
                },
                required: ['title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_task',
            description:
                'Update a task by id or fuzzy match; perform atomic field updates and return a diff preview.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_id: { type: ['string', 'null'], description: 'Exact task ID when known' },
                    fuzzy_key: {
                        type: ['string', 'null'],
                        description: 'Natural language reference if ID unknown',
                    },
                    set: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            title: { type: ['string', 'null'] },
                            due: {
                                type: ['string', 'null'],
                                description:
                                    'ISO8601 date or date-time (e.g., "2025-10-01" or "2025-10-01T10:00:00Z")',
                            },
                            priority: {
                                type: ['string', 'null'],
                                enum: ['P0', 'P1', 'P2', 'P3', null],
                            },
                            labels: { type: ['array', 'null'], items: { type: 'string' } },
                            duration_minutes: {
                                type: ['integer', 'null'],
                                minimum: 5,
                                maximum: 1440,
                            },
                            notes: { type: ['string', 'null'] },
                            status: {
                                type: ['string', 'null'],
                                enum: ['open', 'in_progress', 'done', 'archived', null],
                            },
                        },
                    },
                },
                required: ['set'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_tasks',
            description:
                'List tasks with filters and sorting; supports pagination and working-hours filter.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    filter: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            priority_at_least: {
                                type: ['string', 'null'],
                                enum: ['P0', 'P1', 'P2', 'P3', null],
                            },
                            due_before: {
                                type: ['string', 'null'],
                                description:
                                    'Date or date-time in ISO 8601 format (e.g., "2025-10-03" or "2025-10-03T23:59:59Z")',
                            },
                            due_after: {
                                type: ['string', 'null'],
                                description:
                                    'Date or date-time in ISO 8601 format (e.g., "2025-10-03" or "2025-10-03T00:00:00Z")',
                            },
                            labels_any: { type: 'array', items: { type: 'string' } },
                            status: {
                                type: ['string', 'null'],
                                enum: ['open', 'in_progress', 'done', 'archived', null],
                            },
                        },
                    },
                    sort: {
                        type: 'string',
                        enum: [
                            'due_asc',
                            'due_desc',
                            'priority_asc',
                            'priority_desc',
                            'created_asc',
                            'created_desc',
                        ],
                        description: 'Sort order',
                    },
                    working_hours_only: {
                        type: 'boolean',
                        description: 'Filter tasks within working hours',
                    },
                    page: {
                        type: 'integer',
                        minimum: 1,
                        description: 'Page number for pagination',
                    },
                    page_size: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        description: 'Number of tasks per page',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'schedule_tasks_to_calendar',
            description:
                'Convert tasks into calendar blocks within working hours, respecting meetings and deadlines.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Task IDs to schedule',
                    },
                    start_date: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Start date for scheduling',
                    },
                    end_date: {
                        type: 'string',
                        format: 'date-time',
                        description: 'End date for scheduling',
                    },
                    working_hours: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            start: {
                                type: 'string',
                                pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
                                description: 'Start time HH:MM',
                            },
                            end: {
                                type: 'string',
                                pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
                                description: 'End time HH:MM',
                            },
                        },
                        required: ['start', 'end'],
                    },
                    buffer_minutes: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 120,
                        description: 'Buffer between blocks',
                    },
                    preview_only: {
                        type: 'boolean',
                        description: 'Generate preview without committing',
                    },
                },
                required: ['task_ids'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'reschedule_tasks',
            description:
                'Detect conflicts and propose revised schedule preserving dependencies; request confirmation before apply.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tasks to reschedule',
                    },
                    conflicts: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Conflict IDs to resolve',
                    },
                    pin_meetings: { type: 'boolean', description: 'Do not move meetings' },
                    preserve_dependencies: {
                        type: 'boolean',
                        description: 'Respect task dependencies',
                    },
                    preview_only: {
                        type: 'boolean',
                        description: 'Generate preview without committing',
                    },
                },
                required: ['task_ids'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'check_deadline_risks',
            description:
                'Detect lead/lag alerts, suggest earlier time blocks, escalate when breach risk exceeds threshold.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_ids: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                        description: 'Specific tasks to check; null for all',
                    },
                    threshold_days: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 30,
                        description: 'Risk threshold in days',
                    },
                    auto_suggest: {
                        type: 'boolean',
                        description: 'Automatically suggest earlier blocks',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calculate_priority_score',
            description:
                'Calculate priority score using impact, urgency, effort, risk; return score with explainability.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_id: { type: 'string', description: 'Task ID to score' },
                    weights: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            impact: { type: 'number', minimum: 0, maximum: 1 },
                            urgency: { type: 'number', minimum: 0, maximum: 1 },
                            effort: { type: 'number', minimum: 0, maximum: 1 },
                            risk: { type: 'number', minimum: 0, maximum: 1 },
                        },
                        description: 'Custom weights; must sum to 1.0',
                    },
                    explain: { type: 'boolean', description: 'Return explainability details' },
                },
                required: ['task_id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'bulk_update_tasks',
            description:
                'Apply bulk operations: reassign, relabel, reschedule, archive; detect conflicts and handle partial success.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tasks to update',
                    },
                    operation: {
                        type: 'string',
                        enum: ['reassign', 'relabel', 'reschedule', 'archive', 'delete'],
                        description: 'Bulk operation type',
                    },
                    params: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            assignee: { type: ['string', 'null'] },
                            labels_add: { type: ['array', 'null'], items: { type: 'string' } },
                            labels_remove: { type: ['array', 'null'], items: { type: 'string' } },
                            reschedule_offset_days: { type: ['integer', 'null'] },
                            archive_reason: { type: ['string', 'null'] },
                        },
                    },
                    preview_only: { type: 'boolean', description: 'Preview without committing' },
                },
                required: ['task_ids', 'operation'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generate_task_brief',
            description:
                'Generate task summary, acceptance criteria, and subtasks from short input; save as editable draft.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    short_input: {
                        type: 'string',
                        description: 'Brief task description from user',
                    },
                    generate_acceptance_criteria: {
                        type: 'boolean',
                        description: 'Include acceptance criteria',
                    },
                    generate_subtasks: { type: 'boolean', description: 'Suggest subtasks' },
                    save_as_draft: { type: 'boolean', description: 'Save without creating task' },
                },
                required: ['short_input'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'undo_last_action',
            description:
                'Single-click undo for the last change within time window; supports all task operations.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    action_id: {
                        type: ['string', 'null'],
                        description: 'Specific action ID; null for last action',
                    },
                    confirm: { type: 'boolean', description: 'Skip confirmation prompt' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_audit_log',
            description:
                'Retrieve audit log for tasks; supports filtering by user, date range, and action type.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_ids: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                        description: 'Filter by task IDs',
                    },
                    user_ids: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                        description: 'Filter by users',
                    },
                    action_types: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                        description: 'Filter by action types',
                    },
                    date_from: { type: ['string', 'null'], format: 'date-time' },
                    date_to: { type: ['string', 'null'], format: 'date-time' },
                    export_format: {
                        type: ['string', 'null'],
                        enum: ['json', 'csv', null],
                        description: 'Export format',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ask_clarification',
            description:
                'Ask user for missing information when required fields are not provided in the original input.',
            parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    missing_fields: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'List of missing required fields',
                    },
                    context: {
                        type: 'string',
                        description: 'Context for the clarification request',
                    },
                    suggestions: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                        description: 'Suggested values if applicable',
                    },
                },
                required: ['missing_fields', 'context'],
            },
        },
    },
];
