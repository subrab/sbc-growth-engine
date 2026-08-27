import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import dashboardRoutes from './routes/dashboard.js';
import activitiesRoutes from './routes/activities.js';
import tasksRoutes from './routes/tasks.js';
import publicRoutes from './routes/public.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Demo-stage CORS: allow any origin. Tighten to an explicit ALLOWED_ORIGINS list
// (see .env.example) once this moves beyond a live demo with a single admin user.
app.use(cors());

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/public', publicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
