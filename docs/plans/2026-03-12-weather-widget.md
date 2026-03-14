# Weather Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal current-conditions weather display (temp, description, city) to the right side of the footer, auto-detected from IP geolocation.

**Architecture:** A self-contained `Weather` component fetches location (via ipapi.co) and weather (via Open-Meteo), caches both in chrome.storage.local, and renders a text-only display in the footer. The footer layout changes from centered to space-between to accommodate the right-aligned weather. Hidden in edit mode and on error.

**Tech Stack:** React 18, Open-Meteo API (free, no key), ipapi.co (free, no key), chrome.storage.local with localStorage fallback.

---

### Task 1: Create the weather utility module

**Files:**
- Create: `src/weather.js`

**Step 1: Create `src/weather.js` with cache helpers**

This module uses the same `chrome.storage.local` / `localStorage` fallback pattern as `src/storage.js` (see `getChromeStorage()` at line 24). Use a dedicated storage key `chrometab_weather`.

```javascript
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
```

Implement these functions:

- `getChromeStorage()` — same pattern as `src/storage.js:24`
- `loadWeatherCache()` — reads `WEATHER_KEY` from storage, returns parsed object or `null`
- `saveWeatherCache(data)` — writes to storage
- `fetchLocation()` — `fetch('https://ipapi.co/json/')`, returns `{ city, latitude, longitude, country }` from the response fields `city`, `latitude`, `longitude`, `country_code`
- `fetchWeather(lat, lon, useFahrenheit)` — calls `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${useFahrenheit ? 'fahrenheit' : 'celsius'}`, returns `{ temperature, weatherCode, unit }` where unit is `'°F'` or `'°C'`
- `describeWeather(code)` — looks up `WMO_DESCRIPTIONS[code]`, returns `'Unknown'` as fallback
- `getWeather()` — the main exported function. Loads cache, checks TTLs, fetches only what's stale, saves updated cache, returns `{ temperature, unit, description, city }` or throws on failure

**Step 2: Verify the module is syntactically correct**

Run: `npx webpack --mode production 2>&1 | tail -3`
Expected: `compiled successfully` (module not imported yet, but should have no syntax errors if imported)

**Step 3: Commit**

```bash
git add src/weather.js
git commit -m "Add weather utility module with caching and API helpers"
```

---

### Task 2: Create the Weather component

**Files:**
- Create: `src/components/Weather.jsx`

**Step 1: Create `src/components/Weather.jsx`**

A self-contained component that:
- Takes no props (it manages its own state entirely)
- Uses `useState` for `{ temperature, unit, description, city }` (initially `null`)
- Uses `useEffect` on mount to call `getWeather()` from `src/weather.js`
- On success: sets state with the result
- On error: leaves state as `null` (renders nothing)
- Renders: if state is `null`, return `null`. Otherwise render a `<span className="weather-widget">` containing `{temperature}{unit}  {description}  {city}` using `<span>` elements with appropriate CSS classes

```jsx
import React, { useState, useEffect } from 'react';
import { getWeather } from '../weather';

const Weather = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    getWeather().then(setWeather).catch(() => {});
  }, []);

  if (!weather) return null;

  return (
    <span className="weather-widget">
      <span className="weather-temp">{weather.temperature}{weather.unit}</span>
      <span className="weather-desc">{weather.description}</span>
      <span className="weather-city">{weather.city}</span>
    </span>
  );
};

export default Weather;
```

**Step 2: Verify build**

Run: `npx webpack --mode production 2>&1 | tail -3`
Expected: `compiled successfully`

**Step 3: Commit**

```bash
git add src/components/Weather.jsx
git commit -m "Add Weather component with self-managed data fetching"
```

---

### Task 3: Add weather CSS styles

**Files:**
- Modify: `src/styles.css` (append after the footer section, around line 1040)

**Step 1: Add weather widget styles**

Append these styles after the existing `.footer` rules (before the Todo List section). All colors use existing theme variables — no new variables needed.

```css
/* ========================================
   Weather Widget
   ======================================== */

.weather-widget {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.weather-temp {
  font-weight: 600;
}
```

**Step 2: Verify build**

Run: `npx webpack --mode production 2>&1 | tail -3`
Expected: `compiled successfully`

**Step 3: Commit**

```bash
git add src/styles.css
git commit -m "Add weather widget CSS styles using theme variables"
```

---

### Task 4: Restructure footer layout and integrate Weather

**Files:**
- Modify: `src/components/Footer.jsx`
- Modify: `src/styles.css`

This is the most delicate task — we're changing the non-editing footer from a single centered flex row to a three-section layout (left spacer, center content, right weather).

**Step 1: Add footer layout CSS**

Add these styles after the `.footer` rule in `src/styles.css`:

```css
.footer-left {
  flex: 1;
}

.footer-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  padding-right: 16px;
}
```

Update the existing `.footer` rule: change `justify-content: center` to `justify-content: space-between`.

**Step 2: Update Footer.jsx**

Import the Weather component. In the non-editing footer (the second `return` block starting at line 88):
- Change the `<div className="footer">` contents to three sections:
  - `<div className="footer-left" />` — empty spacer
  - `<div className="footer-center">` — move ALL existing footer content (profile pills, dividers, update, todo, tabset) inside this div
  - `<div className="footer-right"><Weather /></div>`

The editing footer (first `return` block, line 27) stays unchanged — no weather widget in edit mode.

Add `Weather` to the props destructuring? No — Weather is imported and rendered directly since it's self-contained.

**Step 3: Verify build**

Run: `npx webpack --mode production 2>&1 | tail -3`
Expected: `compiled successfully`

**Step 4: Manual verification**

Run: `npm run dev`
Open: `http://localhost:3000`

Verify:
1. Non-editing footer shows existing controls centered and weather at the right
2. Click "update" — editing footer appears, no weather widget
3. Cancel editing — weather reappears
4. If weather API fails (e.g., disconnect network), footer shows normally without weather

**Step 5: Commit**

```bash
git add src/components/Footer.jsx src/styles.css
git commit -m "Integrate weather widget into footer with three-section layout"
```

---

### Task 5: Final verification and push

**Step 1: Full production build**

Run: `npx webpack --mode production 2>&1`
Expected: `compiled successfully`, no warnings

**Step 2: Dev server check**

Run: `npm run dev`
Open: `http://localhost:3000`

Test matrix:
- [ ] Weather shows in non-editing footer (right side)
- [ ] Weather hidden in editing footer
- [ ] Light mode: weather text is readable
- [ ] Dark mode: weather text is readable (toggle via edit mode)
- [ ] Footer center content is still visually centered

**Step 3: Push**

```bash
git push -u origin alex/weather-widget
```
