const webpush = require('web-push');

function configurePush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys missing — push notifications are disabled. Run `npm run generate-vapid`.');
    return false;
  }
  webpush.setVapidDetails(
    VAPID_CONTACT_EMAIL || 'mailto:example@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  return true;
}

async function sendReminder(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // 410/404 means the subscription is dead (user revoked permission, browser data cleared, etc).
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { expired: true };
    }
    console.error('Push send failed:', err.message);
  }
  return { expired: false };
}

module.exports = { configurePush, sendReminder };
