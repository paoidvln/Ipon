const express = require('express');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const { buildWeek52, buildEnv100, buildCustom, goalOf } = require('../utils/challengeBuilders');

const router = express.Router();
router.use(requireAuth);

// Fetch (or lazily create) the week52 and env100 challenges; custom only shown once built.
router.get('/dashboard', async (req, res) => {
  const userId = req.session.userId;

  let week52 = await Challenge.findOne({ user: userId, type: 'week52' });
  if (!week52) {
    const entries = buildWeek52();
    week52 = await Challenge.create({ user: userId, type: 'week52', goal: goalOf(entries), entries });
  }

  let env100 = await Challenge.findOne({ user: userId, type: 'env100' });
  if (!env100) {
    const entries = buildEnv100();
    env100 = await Challenge.create({ user: userId, type: 'env100', goal: goalOf(entries), entries });
  }

  const custom = await Challenge.findOne({ user: userId, type: 'custom' });
  const user = await User.findById(userId);

  res.render('dashboard', {
    username: user.username,
    hasPushSubscription: !!user.pushSubscription,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    challenges: { week52, env100, custom }
  });
});

// Toggle a single entry's saved state.
router.post('/challenge/:type/toggle/:index', async (req, res) => {
  const { type, index } = req.params;
  const idx = parseInt(index, 10);

  const challenge = await Challenge.findOne({ user: req.session.userId, type });
  if (!challenge || idx < 0 || idx >= challenge.entries.length) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const entry = challenge.entries[idx];
  entry.saved = !entry.saved;
  entry.savedAt = entry.saved ? new Date() : null;
  await challenge.save();

  res.json({ ok: true, entry });
});

// Build or rebuild the custom challenge.
router.post('/challenge/custom/build', async (req, res) => {
  const goal = parseFloat(req.body.goal);
  const count = parseInt(req.body.count, 10);

  if (!goal || goal <= 0 || !count || count <= 0) {
    return res.status(400).json({ error: 'Enter a valid goal and number of parts.' });
  }

  const entries = buildCustom(goal, count);
  const challenge = await Challenge.findOneAndUpdate(
    { user: req.session.userId, type: 'custom' },
    { goal, entries },
    { upsert: true, new: true }
  );

  res.json({ ok: true, challenge });
});

// Reset a challenge: week52/env100 rebuild fresh entries, custom clears saved flags only.
router.post('/challenge/:type/reset', async (req, res) => {
  const { type } = req.params;
  const challenge = await Challenge.findOne({ user: req.session.userId, type });
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  if (type === 'week52') {
    challenge.entries = buildWeek52();
  } else if (type === 'env100') {
    challenge.entries = buildEnv100();
  } else {
    challenge.entries.forEach(e => { e.saved = false; e.savedAt = null; });
  }
  challenge.goal = goalOf(challenge.entries);
  await challenge.save();

  res.json({ ok: true, challenge });
});

// Cumulative savings over time, for the progress chart.
router.get('/challenge/:type/chart-data', async (req, res) => {
  const challenge = await Challenge.findOne({ user: req.session.userId, type: req.params.type });
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const points = challenge.entries
    .filter(e => e.saved && e.savedAt)
    .sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));

  let running = 0;
  const series = points.map(e => {
    running += e.amount;
    return { date: e.savedAt, total: running };
  });

  res.json({ series, goal: challenge.goal });
});

// Store the browser's push subscription for this user.
router.post('/push/subscribe', async (req, res) => {
  const user = await User.findById(req.session.userId);
  user.pushSubscription = req.body.subscription;
  await user.save();
  res.json({ ok: true });
});

router.post('/push/unsubscribe', async (req, res) => {
  const user = await User.findById(req.session.userId);
  user.pushSubscription = null;
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
