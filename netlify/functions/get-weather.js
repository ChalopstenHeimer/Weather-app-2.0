const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { city } = event.queryStringParameters;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed fetching data" }) };
  }
};