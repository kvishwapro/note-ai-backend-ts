import { Router, Request, Response } from 'express';
import { authenticateUser, handleLoadMessage, handleMessage } from '../services/chat.service';
import { storeMemory } from '../memory/memories';

interface SendMessageRequest {
    user_id: string;
    message: string;
}

const router = Router();

// POST /send-message
router.post('/send-message', async (req: Request, res: Response) => {
    try {
        const { user_id, message }: SendMessageRequest = req.body;

        if (!user_id || !message) {
            res.status(400).json({ error: 'user_id and message are required' });
            return;
        }

        // Authenticate user and get profile
        const { authenticated, profile } = await authenticateUser(user_id);
        if (!authenticated) {
            res.status(401).json({ error: 'Invalid user' });
            return;
        }

        // Handle message
        const response = await handleMessage(user_id, message, profile);

        console.log(response);

        // Store user message in vector DB
        try {
            await storeMemory(user_id, message, 'user');
            await storeMemory(user_id, response.reply, 'ai');
        } catch (storeError) {
            console.error('Failed to store message in vector DB:', storeError);
        }

        res.json(response);
        return;
    } catch (error) {
        console.error('Error in /send-message:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});

router.get('/load-message', async (req: Request, res: Response) => {
    try {
        const { user_id }: { user_id: string } = req.query as { user_id: string };

        const response = await handleLoadMessage(user_id);

        res.json(response);
    } catch (error) {
        console.error('Error in /load-message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

    res.status(200).json({ message: 'Load message endpoint - to be implemented' });
});

export default router;
