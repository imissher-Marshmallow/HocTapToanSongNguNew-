const http = require('http');

function testServer() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Server is running!');
      console.log('Response:', data);
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('❌ Server not responding:', err.message);
    process.exit(1);
  });

  req.end();
}

console.log('Testing connection to localhost:3000...');
setTimeout(testServer, 1000);
