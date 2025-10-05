import { OpenAI } from 'openai';
import { RESPONSE_FORMAT } from '../config/format';
import zodToJsonSchema from 'zod-to-json-schema';

export class AIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY,
        });
    }

    structured_output = async (messages: string, tool_name: keyof typeof RESPONSE_FORMAT) => {
        try {
            const schema = RESPONSE_FORMAT[tool_name];
            if (!schema) {
                throw new Error(`No schema found for tool: ${tool_name}`);
            }
            const completion = await this.openai.chat.completions.create({
                model: 'openai/gpt-oss-20b',
                messages: [
                    {
                        role: 'user',
                        content: messages,
                    },
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: `${tool_name}_response`,
                        schema: zodToJsonSchema(schema),
                        strict: true,
                    },
                },
                tool_choice: 'auto',
                temperature: 0,
            });

            const response = completion.choices[0].message.content;
            return response;
        } catch {
            throw new Error('No valid response from AI');
        }
    };
}

// Export a singleton instance
export const aiService = new AIService();
