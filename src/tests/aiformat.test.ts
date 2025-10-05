import { aiService } from '../services/ai.service';
import { RESPONSE_FORMAT } from '../config/format';

describe('AI Format Tests', () => {
    it('should return a valid response that matches zod schema', async () => {
        const response = await aiService.structured_output(
            `Convert this to JSON format {
                reply: 'Here’s your current task list:\n' +
                    '\n' +
                    '| ID | Title                     | Priority | Duration |\n' +
                    '|----|---------------------------|----------|----------|\n' +
                    '| 9  | Fix call bug in repo ppb  | Medium\u202f(P2) | 3\u202fhrs (180\u202fmin) |\n' +
                    '\n' +
                    'Let me know what you’d like to do next!'
                }`,
            'list_tasks'
        );
        console.log(response);

        // Parse and validate response against zod schema
        if (!response) {
            throw new Error('No response received from AI service');
        }
        const parsedResponse = JSON.parse(response);
        const validatedResponse = RESPONSE_FORMAT.list_tasks.parse(parsedResponse);

        // Verify the response structure matches expected format
        expect(validatedResponse).toHaveProperty('ai_summary');
        expect(validatedResponse).toHaveProperty('tasks');
        expect(validatedResponse).toHaveProperty('count');
        expect(Array.isArray(validatedResponse.tasks)).toBe(true);
        expect(typeof validatedResponse.count).toBe('number');
        expect(typeof validatedResponse.ai_summary).toBe('string');
    });
});
