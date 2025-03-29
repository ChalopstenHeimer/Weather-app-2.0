const API_KEY = "process.env.OPENWEATHER_API_KEY"; // Replace with your key

async function getWeather(city) {
  showLoading();
  const cacheKey = `weather_${city.toLowerCase()}`;
  const cachedData = getCachedWeather(cacheKey);

  if (cachedData) {
    displayWeather(cachedData);
    initRadarMap(cachedData.coord.lat, cachedData.coord.lon);
    getForecast(cachedData.coord.lat, cachedData.coord.lon);
    hideLoading();
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-weather?city=${encodeURIComponent(city)}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    if (data.cod !== 200) { // OpenWeatherMap error code
      throw new Error(data.message || "Weather data unavailable");
    }
    cacheWeather(cacheKey, data);
    displayWeather(data);
    initRadarMap(data.coord.lat, data.coord.lon);
    getForecast(data.coord.lat, data.coord.lon);
  } catch (error) {
    showError(ERROR_TYPES.WEATHER_API, `Weather data failed: ${error.message}`);
    alert("City not found!");
  } finally {
    hideLoading();
  }
}

function displayWeather(data) {
  const temp = Math.round(convertTemp(data.main.temp, currentUnit));
  const unitSymbol = currentUnit === "celsius" ? "°C" : "°F";

  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();

  const weatherDiv = document.getElementById("current-weather");
  weatherDiv.innerHTML = `
        <h2>${data.name}, ${data.sys.country}</h2>
        <div class="weather-grid">
            <div class="weather-main">
                <p>🌡️ Temp: ${temp}${unitSymbol}</p>
                <p>☁️ Feels like: ${Math.round(convertTemp(data.main.feels_like, currentUnit))}${unitSymbol}</p>
                <p>💧 Humidity: ${data.main.humidity}%</p>
            </div>
            <div class="weather-details">
                <p>🌅 Sunrise: ${sunrise}</p>
                <p>🌇 Sunset: ${sunset}</p>
                <p>📊 Pressure: ${data.main.pressure} hPa</p>
                <p>🌬️ Wind: ${data.wind.speed} m/s (${data.wind.deg}°)</p>
                <p>👁️ Visibility: ${(data.visibility / 1000).toFixed(1)} km</p>
            </div>
        </div>
        <p class="weather-description">${data.weather[0].main}: ${data.weather[0].description}</p>
    `;
}

document.getElementById("search-btn").addEventListener("click", () => {
  const city = document.getElementById("city-input").value;
  if (city) getWeather(city);
});
document.getElementById("location-btn").addEventListener("click", getUserLocation);

let radarMap;

function initRadarMap(lat, lon) {
  // Remove old map if it exists
  if (radarMap) {
    document.getElementById("radar-map").innerHTML = "";
  }

  // Create an iframe with RainViewer radar
  const radarIframe = document.createElement("iframe");
  radarIframe.src = `https://www.rainviewer.com/map.html?loc=${lat},${lon},6&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=0&c=1&o=83&lm=0&th=0&sm=1&sn=1`;
  radarIframe.width = "100%";
  radarIframe.height = "400";
  radarIframe.frameBorder = "0";
  document.getElementById("radar-map").appendChild(radarIframe);
  radarMap = radarIframe;
}

// Update getWeather() to include radar
async function getWeather(city) {
  showLoading();
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();
    displayWeather(data);
    initRadarMap(data.coord.lat, data.coord.lon); // Add radar for location
  } catch (error) {
    console.error("Error fetching weather:", error);
    alert("City not found!");
  } finally {
    hideLoading();
  }
}

async function getForecast(lat, lon) {
  showLoading();
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();
    displayForecast(data);
  } catch (error) {
    console.error("Error fetching forecast:", error);
  } finally {
    hideLoading();
  }
}

function displayForecast(data) {
  const forecastDiv = document.getElementById("forecast");
  forecastDiv.innerHTML = ""; // Clear previous forecast

  // Show only one forecast per day (OpenWeather provides 3-hour intervals)
  const dailyForecasts = data.list.filter((item, index) => index % 8 === 0);

  dailyForecasts.forEach(day => {
    const date = new Date(day.dt * 1000).toLocaleDateString("en-US", { weekday: "short" });
    const temp = Math.round(day.main.temp);
    const icon = `https://openweathermap.org/img/wn/${day.weather[0].icon}.png`;

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
          <p><strong>${date}</strong></p>
          <img src="${icon}" alt="${day.weather[0].description}">
          <p>${temp}°C</p>
          <p>${day.weather[0].main}</p>
      `;
    forecastDiv.appendChild(card);
  });
}

// Add this at the bottom of script.js
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        getWeatherByCoords(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Geolocation blocked. Showing default city (London).");
        getWeather("London"); // Fallback
      }
    );
  } else {
    alert("Geolocation not supported. Showing default city (London).");
    getWeather("London"); // Fallback
  }
}

async function getWeatherByCoords(lat, lon) {
  showLoading();
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();
    displayWeather(data);
    initRadarMap(lat, lon);
    getForecast(lat, lon);
  } catch (error) {
    console.error("Error fetching weather by location:", error);
  } finally {
    hideLoading();
  }
}

// Auto-load weather on page load
window.addEventListener("load", () => {
  getUserLocation(); // Try geolocation first
});
document.getElementById("location-btn").addEventListener("click", getUserLocation);

function showLoading() {
  document.getElementById("loading-spinner").style.display = "block";
  document.getElementById("loading-overlay").style.display = "block";
}

function hideLoading() {
  document.getElementById("loading-spinner").style.display = "none";
  document.getElementById("loading-overlay").style.display = "none";
}

const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

function getCachedWeather(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_EXPIRY) return null;

  return data;
}

function cacheWeather(key, data) {
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

let currentUnit = "celsius";

function convertTemp(temp, unit) {
  return unit === "celsius" ? temp : (temp * 9 / 5) + 32;
}

function updateAllTemperatures() {
  const city = document.getElementById("city-input").value || "London";
  const cacheKey = `weather_${city.toLowerCase()}`;
  const cachedData = getCachedWeather(cacheKey);

  if (cachedData) {
    displayWeather(cachedData);
    displayForecast(cachedData); // You'll need to modify displayForecast similarly
  }
}

// Add event listeners for unit toggle
document.getElementById("unit-btn").addEventListener("click", () => {
  currentUnit = "celsius";
  document.getElementById("unit-btn").classList.add("active");
  document.getElementById("unit-btn-f").classList.remove("active");
  updateAllTemperatures();
});

document.getElementById("unit-btn-f").addEventListener("click", () => {
  currentUnit = "fahrenheit";
  document.getElementById("unit-btn-f").classList.add("active");
  document.getElementById("unit-btn").classList.remove("active");
  updateAllTemperatures();
});

// Error types
const ERROR_TYPES = {
  GEOLOCATION: "geolocation",
  WEATHER_API: "weather_api",
  FORECAST_API: "forecast_api",
  RADAR: "radar"
};

// Error display element (add to HTML)
function showError(type, message) {
  const errorDiv = document.getElementById("error-display") || createErrorDisplay();
  errorDiv.innerHTML = `
      <div class="error-message ${type}">
          ⚠️ ${message}
          <button class="close-error">✕</button>
      </div>
  `;
  errorDiv.style.display = "block";

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

function createErrorDisplay() {
  const div = document.createElement("div");
  div.id = "error-display";
  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.right = "20px";
  div.style.zIndex = "2000";
  document.body.appendChild(div);
  return div;
}

let touchStartY = 0;

document.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  const touchY = e.touches[0].clientY;
  const pullDistance = touchY - touchStartY;

  // Only trigger if pulled down from top
  if (window.scrollY === 0 && pullDistance > 50) {
    refreshWeather();
    e.preventDefault(); // Prevent overscroll
  }
}, { passive: false });

// Pull to refresh 
function refreshWeather() {
  const city = document.getElementById("city-input").value;
  if (city) {
    // Clear cache for this city
    localStorage.removeItem(`weather_${city.toLowerCase()}`);
    getWeather(city);
  } else {
    getUserLocation(); // Refresh current location
  }

  // Visual feedback
  const container = document.querySelector(".container");
  container.style.transform = "translateY(30px)";
  setTimeout(() => {
    container.style.transform = "translateY(0)";
  }, 300);
}

