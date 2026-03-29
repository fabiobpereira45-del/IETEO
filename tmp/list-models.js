const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Found gemini-1.5-flash");
  } catch (e) {
    console.log("Did NOT find gemini-1.5-flash:", e.message);
  }

  try {
    const list = await genAI.listModels();
    console.log("Available models:");
    list.models.forEach(m => console.log(m.name));
  } catch (e) {
    console.log("Error listing models:", e.message);
  }
}

listModels();
