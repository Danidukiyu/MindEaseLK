const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAI() {
  const apiKey = (process.env.GOOGLE_API_KEY || "").trim();
  console.log("Testing with API Key: ", apiKey ? "Found (masked)" : "Not Found");
  
  if (!apiKey) {
    console.error("No API key found in path:", path.join(__dirname, '.env'));
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    console.log("Sending request to Google AI...");
    const result = await model.generateContent("Hello, are you there?");
    const response = await result.response;
    console.log("Response received: ", response.text());
    console.log("SUCCESS: Connection to Google AI is working.");
    process.exit(0);
  } catch (err) {
    console.error("AI TEST FAILED: ", err);
    console.error("Error Message: ", err.message);
    process.exit(1);
  }
}

testAI();
