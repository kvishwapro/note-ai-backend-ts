export interface Task {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    duration_minutes?: number;
    priority?: string;
    labels?: string[];
    notes?: string;
    status?: string;
}
