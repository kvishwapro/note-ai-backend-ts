import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const getTasks = async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin!.from('tasks').select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
    return;
};

export const getTaskById = async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin!
        .from('tasks')
        .select('*')
        .eq('id', req.params.id)
        .single();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    if (data) {
        res.json(data);
        return;
    } else {
        res.status(404).send('Task not found');
        return;
    }
};

export const createTask = async (req: Request, res: Response) => {
    const {
        title,
        description,
        duration_minutes,
        priority = 'P2',
        labels = [],
        notes,
        status = 'open',
    } = req.body;
    const { data, error } = await supabaseAdmin!
        .from('tasks')
        .insert([
            {
                title,
                description,
                completed: false,
                duration_minutes,
                priority,
                labels,
                notes,
                status,
            },
        ])
        .select()
        .single();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
    return;
};

export const updateTask = async (req: Request, res: Response) => {
    const { title, description, completed, duration_minutes, priority, labels, notes, status } =
        req.body;
    const { data, error } = await supabaseAdmin!
        .from('tasks')
        .update({
            title,
            description,
            completed,
            duration_minutes,
            priority,
            labels,
            notes,
            status,
        })
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    if (data) {
        res.json(data);
        return;
    } else {
        res.status(404).send('Task not found');
        return;
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    const { error } = await supabaseAdmin!.from('tasks').delete().eq('id', req.params.id);
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.status(204).send();
    return;
};
