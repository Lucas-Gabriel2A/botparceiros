const OpenAI = require("openai");
require('dotenv').config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

async function listModels() {
  try {
    const models = await client.models.list();
    console.log("Available Models:");
    models.data.forEach(m => console.log(m.id));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
