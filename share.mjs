import localtunnel from 'localtunnel';

const PORT = 5173;
const SUBDOMAIN = 'rezoo-ai-' + Math.floor(Math.random() * 899999 + 100000);

console.log('===================================================');
console.log('       🚀  REZOO AI - SHARE WITH FRIENDS');
console.log('===================================================');
console.log('🔗 Connecting to secure global HTTPS tunnel...');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
    });

    console.log('\n===================================================');
    console.log('🎉 SUCCESS! YOUR REZOO AI LINK IS READY:');
    console.log(👉  );
    console.log('===================================================');
    console.log('📱 Send this link to your friends or open on your phone!');
    console.log('⚡ Works anywhere in the world on Android, iPhone & PC.');
    console.log('⚠️  Note for friends: If it asks for password/IP, just enter your Public IP or click Click to Continue.\n');

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      try { tunnel.close(); } catch {}
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
