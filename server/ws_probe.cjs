const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3002/ws/openclaw');
ws.on('open', () => {
  console.log('OPEN');
  ws.send(JSON.stringify({ message: 'ping from probe' }));
});
ws.on('message', (m) => console.log('MSG', m.toString().slice(0, 400)));
ws.on('error', (e) => console.log('ERR', e.message));
ws.on('close', (code, reason) => {
  console.log('CLOSE', code, reason.toString());
  process.exit(0);
});
setTimeout(() => {
  console.log('TIMEOUT');
  ws.close();
}, 7000);
