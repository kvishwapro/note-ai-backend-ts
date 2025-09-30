import { supabaseAdmin } from '../config/supabase';

const OLLAMA_MODEL = 'nomic-embed-text';
const DIMENSIONS = 768;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

interface OllamaEmbeddingResponse {
    embedding: number[];
}

export type MatchMemoriesRow = {
    id: number;
    user_id: string;
    content: string;
    role: 'user' | 'ai';
    embedding: number[]; // Supabase returns vector as number[]
    created_at: string; // ISO string
    similarity: number; // 0..1, higher is better
};

export type ConversationMessage = {
    id: number;
    content: string;
    role: 'user' | 'ai';
    created_at: string;
};

/**
 * Generate an embedding for text using Ollama (nomic-embed-text, 768 dims)
 */
async function embed(text: string): Promise<number[]> {
    const trimmed = text?.trim();
    if (!trimmed) throw new Error('Text for embedding is empty');

    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: trimmed,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;
    const vector = data.embedding;

    if (!vector || vector.length !== DIMENSIONS) {
        throw new Error(
            `Invalid embedding vector. Expected ${DIMENSIONS}, got ${vector?.length ?? 0}`
        );
    }
    return vector;
}

/**
 * Store a memory for a user by generating an embedding and inserting into public.memories
 */
export async function storeMemory(
    userId: string,
    text: string,
    role: 'user' | 'ai'
): Promise<{ id: number }> {
    if (!userId) throw new Error('userId is required');
    if (!text?.trim()) throw new Error('text is required');
    if (!role || !['user', 'ai'].includes(role)) throw new Error('role must be "user" or "ai"');

    const embedding = await embed(text);

    const { data, error } = await supabaseAdmin!
        .from('memories')
        .insert([
            {
                user_id: userId,
                content: text,
                role,
                embedding, // pgvector serialized from number[],
            },
        ])
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to insert memory: ${error.message}`);
    }

    return { id: (data as { id: number }).id as number };
}

/**
 * Search memories for a user by semantic similarity using match_memories RPC.
 * - matchThreshold: similarity threshold in [0..1], higher is more similar (default 0.8)
 * - matchCount: number of rows to return (default 8)
 */
export async function searchMemories(
    userId: string,
    query: string,
    options?: { matchThreshold?: number; matchCount?: number }
): Promise<MatchMemoriesRow[]> {
    if (!userId) throw new Error('userId is required');
    if (!query?.trim()) throw new Error('query is required');

    const threshold = options?.matchThreshold ?? 0.8;
    const count = options?.matchCount ?? 8;

    const queryEmbedding = await embed(query);

    // SQL: match_memories(query_embedding, match_threshold, match_count, target_user_id)
    const { data, error } = await supabaseAdmin!.rpc('match_memories', {
        query_embedding: queryEmbedding as unknown as number[],
        match_threshold: threshold,
        match_count: count,
        target_user_id: userId,
    });

    if (error) {
        throw new Error(`match_memories RPC failed: ${error.message}`);
    }

    return (data as MatchMemoriesRow[]) ?? [];
}

/**
 * Get the last N messages for a user by chronological order (most recent first)
 * Used for conversation context without embeddings
 */
export async function getRecentMessages(
    userId: string,
    limit: number = 30
): Promise<ConversationMessage[]> {
    if (!userId) throw new Error('userId is required');

    const { data, error } = await supabaseAdmin!
        .from('memories')
        .select('id, content, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    // Reverse to get chronological order (oldest first)
    return (data as ConversationMessage[]).reverse();
}
