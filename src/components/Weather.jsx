import React, { useState, useEffect } from 'react';
import { getWeather } from '../weather';

const Weather = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getWeather()
      .then((data) => { if (!cancelled) setWeather(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!weather) return null;

  return (
    <span className="weather-widget" title="Current weather">
      <span className="weather-temp">{weather.temperature}{weather.unit}</span>
      <span className="weather-desc">{weather.description}</span>
      <span className="weather-city">{weather.city}</span>
    </span>
  );
};

export default Weather;
