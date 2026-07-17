// Run once: npm run generate-vapid
// Prints a VAPID key pair. Paste the values into your .env file.
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('\nAdd these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`);
