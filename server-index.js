import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import comicRoutes from './routes/comicRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// BUG FIX #12: restrict CORS to known client origin only
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman in dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.use('/api', comicRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
});
