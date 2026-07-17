require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const connectDB = require('./config/db');
const { configurePush } = require('./utils/push');
const { startReminderJob } = require('./utils/reminderJob');
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenge');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function start() {
  await connectDB();

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 days
  }));

  app.get('/', (req, res) => res.redirect(req.session.userId ? '/dashboard' : '/login'));
  app.use('/', authRoutes);
  app.use('/', challengeRoutes);

  const pushEnabled = configurePush();
  if (pushEnabled) startReminderJob();

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Ipon Challenge running on http://localhost:${port}`));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
