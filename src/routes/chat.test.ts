import { detectIntent, INTENTS } from './chat';

describe('detectIntent', () => {
    test('detectIntent returns an intent', async () => {
        const intent = await detectIntent('Hello, how are you?');
        expect(typeof intent).toBe('string');
        expect(intent.length).toBeGreaterThan(0);
        expect(intent).toBe(INTENTS['SMALLTALK']);
    });

    test('detectIntent handles empty input', async () => {
        const intent = await detectIntent('');
        expect(intent).toBe(INTENTS['SMALLTALK']);
    });

    test('detectIntent handles add_task intent', async () => {
        const intent = await detectIntent('Add a task to buy groceries');
        expect(intent).toBe(INTENTS['ADD_TASK']);
    });

    test('detectIntent handles list_tasks intent', async () => {
        const intent = await detectIntent('List all my tasks');
        expect(intent).toBe(INTENTS['LIST_TASKS']);
    });

    test('detectIntent handles delete_task intent', async () => {
        const intent = await detectIntent('Delete the task to buy groceries');
        expect(intent).toBe(INTENTS['DELETE_TASK']);
    });
});
