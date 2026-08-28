const fetch = require("node-fetch"); // Wait, next has global fetch in node 18+, but let's just use global fetch if available, or install node-fetch. In modern Node (v18+), global fetch is available.

const apiKey = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjNiYWM5NDVmLTEzNTktNGI5Zi05NmE2LTc4YzUxZWUzMzMxZjo6JGFhY2hfNzE2MTZhNDktMjkxNS00NmVlLWJjMGEtMDQyYTYzMzVlNDhk";
const baseUrl = "https://api.asaas.com/v3"; // production

async function test() {
  try {
    const res = await fetch(`${baseUrl}/finance/balance`, {
      headers: { "access_token": apiKey }
    });
    console.log("Status:", res.status);
    const body = await res.json();
    console.log("Body:", JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("Erro:", err);
  }
}

test();
