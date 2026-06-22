import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { walkthroughRouter } from './routes/walkthrough.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/walkthroughs', walkthroughRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use(errorHandler as any);

export { app };
export default app;
