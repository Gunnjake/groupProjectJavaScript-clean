// Simple deployment test script
// Tests that the server is running and responding correctly

const http = require('http');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';

console.log(`Testing deployment on ${HOST}:${PORT}...\n`);

// Test health endpoint
const healthUrl = `http://${HOST}:${PORT}/health`;

http.get(healthUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const response = JSON.parse(data);
                console.log('✓ Health check passed!');
                console.log(`  Status: ${response.status}`);
                console.log(`  Environment: ${response.environment}`);
                console.log(`  Port: ${response.port}`);
                console.log(`  Timestamp: ${response.timestamp}`);
                console.log('\n✓ Deployment test successful!');
                process.exit(0);
            } catch (error) {
                console.error('✗ Failed to parse health check response');
                console.error(`  Response: ${data}`);
                process.exit(1);
            }
        } else {
            console.error(`✗ Health check failed with status ${res.statusCode}`);
            console.error(`  Response: ${data}`);
            process.exit(1);
        }
    });
}).on('error', (error) => {
    console.error(`✗ Failed to connect to server: ${error.message}`);
    console.error(`  Make sure the server is running on ${HOST}:${PORT}`);
    process.exit(1);
});



