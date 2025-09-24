const https = require('https');
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(url, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test FluidPay transaction with detailed logging
async function testFluidPayTransaction() {
  try {
    console.log("=== FLUIDPAY TRANSACTION TEST ===");
    console.log("Timestamp:", new Date().toISOString());

    // Test data - you'll need to replace these with actual values
    const testData = {
      clubId: "001", // Replace with actual club ID
      amount: "10.00", // Test amount
      token: "test_token_12345", // Replace with actual FluidPay token
      customerInfo: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      },
    };

    console.log("Test data:", testData);

    const response = await makeRequest(
      "http://localhost:5001/api/payment/test-fluidpay-transaction",
      testData
    );

    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Test failed:");
    console.error("Message:", error.message);
  }
}

// Also test basic connection
async function testFluidPayConnection() {
  try {
    console.log("\n=== FLUIDPAY CONNECTION TEST ===");

    const response = await makeRequest(
      "http://localhost:5001/api/payment/test-fluidpay",
      {
        clubId: "001", // Replace with actual club ID
      }
    );

    console.log(
      "Connection test response:",
      JSON.stringify(response.data, null, 2)
    );
  } catch (error) {
    console.error("Connection test failed:");
    console.error("Message:", error.message);
  }
}

// Run both tests
async function runTests() {
  await testFluidPayConnection();
  await testFluidPayTransaction();
}

runTests();
