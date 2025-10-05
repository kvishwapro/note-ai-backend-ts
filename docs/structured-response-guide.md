# Structured Response Guide

## Overview

The chat service now returns structured responses based on the tool that was called. Each tool has a predefined Zod schema in `src/config/format.ts` that defines the exact structure of the response.

## How It Works

1. **User sends a message** → AI determines intent and selects appropriate tool
2. **Tool is executed** → Database operations are performed
3. **Response is formatted** → Output is structured according to the tool's schema
4. **Client receives** → Structured JSON response (no freeform text)

## Response Structure

All responses follow this pattern:

```typescript
{
  reply: string;              // AI summary for display
  structured_response: {      // Structured data matching tool schema
    ai_summary: string;       // Human-readable summary
    // ... other fields specific to the tool
  };
  optional_data?: any;        // Additional metadata
}
```

## Tool Response Schemas

### create_task

**User Input:** "Add a task to review the quarterly report by Friday"

**Structured Response:**
```json
{
  "ai_summary": "Task \"Review quarterly report\" has been created successfully.",
  "task_id": 123,
  "task_title": "Review quarterly report",
  "task_status": "open",
  "task_duration_minutes": null,
  "task_priority": "P2",
  "task_labels": null,
  "task_due_date": "2025-10-03"
}
```

### list_tasks

**User Input:** "Show me my tasks"

**Structured Response:**
```json
{
  "ai_summary": "Found 3 task(s).",
  "tasks": [
    {
      "id": 1,
      "title": "Review quarterly report",
      "status": "open",
      "duration_minutes": 60,
      "priority": "P1",
      "labels": ["work"],
      "due_date": "2025-10-03"
    },
    {
      "id": 2,
      "title": "Buy groceries",
      "status": "open",
      "duration_minutes": 30,
      "priority": "P2",
      "labels": ["personal"],
      "due_date": null
    }
  ],
  "count": 2
}
```

### update_task

**User Input:** "Mark task #123 as done"

**Structured Response:**
```json
{
  "ai_summary": "Task has been updated successfully.",
  "task_id": 123,
  "task_title": "Review quarterly report",
  "task_status": "done",
  "task_duration_minutes": 60,
  "task_priority": "P1",
  "task_labels": ["work"],
  "task_due_date": "2025-10-03"
}
```

### delete_task

**User Input:** "Delete task #123"

**Structured Response:**
```json
{
  "ai_summary": "Task #123 has been deleted.",
  "task_id": 123
}
```

### check_deadline_risks

**User Input:** "Check which tasks are at risk"

**Structured Response:**
```json
{
  "ai_summary": "Found 2 task(s) at risk.",
  "risks": [
    {
      "task_id": 45,
      "task_title": "Submit proposal",
      "due_date": "2025-10-02",
      "days_until_due": 1,
      "at_risk": true,
      "overdue": false
    },
    {
      "task_id": 67,
      "task_title": "Review contract",
      "due_date": "2025-09-30",
      "days_until_due": -1,
      "at_risk": false,
      "overdue": true
    }
  ],
  "total_at_risk": 2
}
```

### ask_clarification

**User Input:** "Add a task" (missing required information)

**Structured Response:**
```json
{
  "ai_summary": "Need clarification on: title, due_date",
  "needs_clarification": true,
  "missing_fields": ["title", "due_date"],
  "context": "To create a task, I need a title and due date.",
  "suggestions": ["What should I call this task?", "When is it due?"]
}
```

## Key Features

### 1. Intent Recognition
The AI automatically maps natural language to the correct tool:
- "add a task" → `create_task`
- "show my tasks" → `list_tasks`
- "mark as done" → `update_task`
- "what's at risk?" → `check_deadline_risks`

### 2. Schema Validation
All responses are validated against Zod schemas before being returned, ensuring type safety.

### 3. No Freeform Text
The system returns only structured data. The `ai_summary` field provides a human-readable message, but the rest is strictly typed.

### 4. Consistent Format
Every tool response includes:
- `ai_summary`: Human-readable summary
- Tool-specific fields defined in the schema

## Implementation Details

### Adding a New Tool

1. **Define the tool** in `src/config/tools.ts`
2. **Define the response schema** in `src/config/format.ts`
3. **Implement the handler** in `src/services/chat.service.ts`
4. **Add formatting logic** in the `formatToolResult` function

Example:
```typescript
// In format.ts
export const RESPONSE_FORMAT = {
  my_new_tool: z.object({
    ai_summary: z.string(),
    result: z.string(),
    count: z.number(),
  }),
  // ... other tools
};

// In chat.service.ts - formatToolResult function
case 'my_new_tool':
  formattedData = {
    ai_summary: `Operation completed with ${rawOutput.count} items.`,
    result: rawOutput.result,
    count: rawOutput.count,
  };
  break;
```

## Error Handling

If a tool execution fails or the response doesn't match the schema, the system falls back to returning the raw output without validation.

## Testing

You can test the structured responses by sending messages to the chat endpoint:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add a task to review the quarterly report",
    "userId": "user-123"
  }'
```

The response will include the `structured_response` field with the formatted data.
