const jwt = require('jsonwebtoken');
const axios = require('axios');

const secret = '523a0139266986c572abc0f208d96f62feb4afba9a03542b8e3e65648a2432b2';
const userId = '6a2442d5d73dc7f21bbda02e'; // Pranav's userId

const token = jwt.sign({ sub: userId, userId }, secret, { expiresIn: '1h' });

async function test() {
  try {
    const res = await axios.get(`http://localhost:3001/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Conversations response:", JSON.stringify(res.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);
    } else {
      console.error("Network Error:", error.message);
    }
  }
}

test();
