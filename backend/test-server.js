// Super simple test - just starts a server on port 3001
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Node.js is working! Port 3001 is accessible.');
});

server.listen(3001, '0.0.0.0', () => {
  console.log('✅ Test server running on port 3001');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
