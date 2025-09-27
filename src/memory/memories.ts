import Groq from 'groq-sdk';
import { supabase } from '../config/supabase';

const GROQ_MODEL = 'nomic-embed-text';
const DIMENSIONS = 768;

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error('Missing GROQ_API_KEY');
}

const groq = new Groq({ apiKey: groqApiKey });

export type MatchMemoriesRow = {
    id: number;
    user_id: string;
    content: string;
    embedding: number[]; // Supabase returns vector as number[]
    created_at: string; // ISO string
    similarity: number; // 0..1, higher is better
};

/**
 * Generate an embedding for text using Groq (nomic-embed-text, 768 dims)
 */
async function embed(text: string): Promise<number[]> {
    const trimmed = text?.trim();
    if (!trimmed) throw new Error('Text for embedding is empty');

    const response = await groq.embeddings.create({
        model: GROQ_MODEL,
        input: trimmed,
    });

    const vector = response.data?.[0]?.embedding as unknown as number[] | undefined;
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
export async function storeMemory(userId: string, text: string): Promise<{ id: number }> {
    if (!userId) throw new Error('userId is required');
    if (!text?.trim()) throw new Error('text is required');

    const embedding = await embed(text);

    const { data, error } = await supabase
        .from('memories')
        .insert([
            {
                user_id: userId,
                content: text,
                embedding, // pgvector serialized from number[]
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
    const { data, error } = await supabase.rpc('match_memories', {
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
