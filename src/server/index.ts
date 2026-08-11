// ============================================================
// جرب حظك — Game Server Entry Point
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRouter from './api/router';
import { setupGameHandlers } from './game/gameServer';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

// Setup game handler
setupGameHandlers(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎰 جرب حظك server running on port ${PORT}`);
});
