const cron = require('node-cron');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const { sendReminder } = require('./push');

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

async function checkAndRemind() {
  const today = new Date();
  const users = await User.find({ pushSubscription: { $ne: null } });

  for (const user of users) {
    const challenges = await Challenge.find({ user: user._id });
    if (challenges.length === 0) continue;

    const savedToday = challenges.some(c =>
      c.entries.some(e => e.saved && e.savedAt && isSameDay(new Date(e.savedAt), today))
    );
    const hasUnfinished = challenges.some(c => c.entries.some(e => !e.saved));

    if (!savedToday && hasUnfinished) {
      const result = await sendReminder(user.pushSubscription, {
        title: 'Ipon Challenge',
        body: "Haven't saved today yet — tap an entry to keep your streak going.",
        url: '/dashboard'
      });
      if (result.expired) {
        user.pushSubscription = null;
        await user.save();
      }
    }
  }
}

function startReminderJob() {
  const hour = parseInt(process.env.REMINDER_HOUR, 10);
  const cronHour = Number.isInteger(hour) ? hour : 20;
  // Runs once a day at the configured hour, server local time.
  cron.schedule(`0 ${cronHour} * * *`, () => {
    checkAndRemind().catch(err => console.error('Reminder job failed:', err));
  });
  console.log(`Reminder job scheduled for ${cronHour}:00 daily`);
}

module.exports = { startReminderJob, checkAndRemind };
