import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = Router();

router.post('/create-token', async (req, res) => {
    const { roomName, participantName } = req.body;
    if (!roomName || !participantName) {
        return res.status(400).json({ error: 'Room and Participant names are required' });
    }
    
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (!apiKey || !apiSecret) {
            return res.status(500).json({ error: 'LiveKit credentials missing' });
    }
    
    const at = new AccessToken(apiKey, apiSecret, { identity: participantName });
    at.addGrant({ roomJoin: true, room: roomName });
    
    res.json({ token: await at.toJwt() });
});

export default router;
