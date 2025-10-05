import { AIService } from '../services/ai.service';
import { RESPONSE_FORMAT } from '../config/format';

// Mock the OpenAI client
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [
                        {
                            message: {
                                content: '{"test": "response"}',
                            },
                        },
                    ],
                }),
            },
        },
    })),
}));

describe('Chat Service Fix', () => {
    let aiService: AIService;

    beforeEach(() => {
        aiService = new AIService();
    });

    it('should accept valid tool names from RESPONSE_FORMAT', async () => {
        const toolName = 'list_tasks' as keyof typeof RESPONSE_FORMAT;
        const messages = 'Test message';

        // This should not throw an error
        const result = await aiService.structured_output(messages, toolName);
        expect(result).toBe('{"test": "response"}');
    });

    it('should work with all valid tool names', async () => {
        const validToolNames = Object.keys(RESPONSE_FORMAT) as (keyof typeof RESPONSE_FORMAT)[];

        for (const toolName of validToolNames) {
            const result = await aiService.structured_output('Test message', toolName);
            expect(result).toBe('{"test": "response"}');
        }
    });
});
