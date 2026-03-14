const WEATHER_KEY = 'chrometab_weather';
const LOCATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const WEATHER_TTL = 30 * 60 * 1000;       // 30 minutes
const FAHRENHEIT_COUNTRIES = ['US', 'LR', 'MM'];

const WMO_DESCRIPTIONS = {
  0: 'Clear',
  1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy',
  51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  56: 'Freezing Drizzle', 57: 'Freezing Drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Heavy Rain',
  66: 'Freezing Rain', 67: 'Freezing Rain',
  71: 'Snow', 73: 'Snow', 75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
  85: 'Snow Showers', 86: 'Snow Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

function getChromeStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

function loadWeatherCache() {
  const storage = getChromeStorage();
  if (!storage) {
    const saved = localStorage.getItem(WEATHER_KEY);
    if (saved) {
      try { return Promise.resolve(JSON.parse(saved)); } catch { /* fall through */ }
    }
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    storage.get(WEATHER_KEY, (result) => {
      resolve(result[WEATHER_KEY] || null);
    });
  });
}

function saveWeatherCache(data) {
  const storage = getChromeStorage();
  if (!storage) {
    localStorage.setItem(WEATHER_KEY, JSON.stringify(data));
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    storage.set({ [WEATHER_KEY]: data }, resolve);
  });
}

async function fetchLocation() {
  const res = await fetch('https://ipapi.co/json/');
  if (!res.ok) throw new Error('Failed to fetch location');
  const json = await res.json();
  if (json.latitude == null || json.longitude == null) {
    throw new Error('Invalid location response');
  }
  return {
    city: json.city || 'Unknown',
    latitude: json.latitude,
    longitude: json.longitude,
    country: json.country_code,
  };
}

async function fetchWeather(lat, lon, useFahrenheit) {
  const unit = useFahrenheit ? 'fahrenheit' : 'celsius';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch weather');
  const data = await res.json();
  if (data.current?.temperature_2m == null || data.current?.weather_code == null) {
    throw new Error('Invalid weather response');
  }
  return {
    temperature: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    unit: useFahrenheit ? '°F' : '°C',
  };
}

/**
 * Returns a human-readable description for a WMO weather code.
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
export function describeWeather(code) {
  return WMO_DESCRIPTIONS[code] ?? 'Unknown';
}

/**
 * Fetches current weather for the user's location (from IP geolocation).
 * Uses cached location and weather when valid; returns temperature, unit, description, and city.
 * @returns {Promise<{temperature: number, unit: string, description: string, city: string}>}
 */
export async function getWeather() {
  let cache = await loadWeatherCache();
  const now = Date.now();

  let location = cache?.location;
  let locationFetchedAt = cache?.locationFetchedAt ?? 0;
  if (!location || now - locationFetchedAt > LOCATION_TTL) {
    location = await fetchLocation();
    locationFetchedAt = now;
  }

  const useFahrenheit = FAHRENHEIT_COUNTRIES.includes(location.country);
  let weather = cache?.weather;
  let weatherFetchedAt = cache?.weatherFetchedAt ?? 0;
  const cacheHasMatchingUnit = cache?.weather?.unit === (useFahrenheit ? '°F' : '°C');
  const cacheHasMatchingCoords = cache?.location?.latitude === location.latitude &&
    cache?.location?.longitude === location.longitude;

  if (!weather || now - weatherFetchedAt > WEATHER_TTL || !cacheHasMatchingUnit || !cacheHasMatchingCoords) {
    weather = await fetchWeather(location.latitude, location.longitude, useFahrenheit);
    weatherFetchedAt = now;
  }

  const updatedCache = {
    location,
    locationFetchedAt,
    weather,
    weatherFetchedAt,
  };
  await saveWeatherCache(updatedCache);

  return {
    temperature: weather.temperature,
    unit: weather.unit,
    description: describeWeather(weather.weatherCode),
    city: location.city,
  };
}
