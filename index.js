const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ENV VARS (set in Vercel dashboard)
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const ASTRO_API_KEY = process.env.ASTRO_API_KEY;

// Helper: get client IP
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress
  );
}

app.get("/api/data", async (req, res) => {
  try {
    const ip = getClientIp(req);

    // 1. GEO DATA
    const geoRes = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,zip,city,country,lat,lon,offset`
    );

    const geo = geoRes.data;
    if (geo.status !== "success") {
      throw new Error("Geo lookup failed");
    }

    // 2. TIME DATA
    const timeRes = await axios.get(
      `https://timeapi.io/api/v1/time/current/ip?ipAddress=${ip}`
    );

    const time = timeRes.data;

    const dateIso = time.date; // YYYY-MM-DD

    // 3. SUN DATA
    const sunRes = await axios.get(
      `https://api.weatherapi.com/v1/astronomy.json`,
      {
        params: {
          key: WEATHER_API_KEY,
          q: ip,
          dt: dateIso,
        },
      }
    );

    const sun = sunRes.data.astronomy.astro;

    // 4. TITHI DATA
    const tithiRes = await axios({
      method: "POST",
      url: "https://json.freeastrologyapi.com/tithi-durations",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ASTRO_API_KEY,
      },
      data: {
        year: time.year,
        month: time.month,
        date: time.day,
        hours: time.hour,
        minutes: time.minute,
        seconds: time.seconds,
        latitude: geo.lat,
        longitude: geo.lon,
        timezone: geo.offset / 3600,
        config: {
          observation_point: "topocentric",
          ayanamsha: "lahiri",
        },
      },
    });

    const tithi = tithiRes.data;

    // FINAL RESPONSE
    res.json({
      ip,
      geo: {
        city: geo.city,
        country: geo.country,
        zip: geo.zip,
        lat: geo.lat,
        lon: geo.lon,
        timezoneOffset: geo.offset / 3600,
      },
      time: {
        date: time.date,
        time: time.time,
        iso: `${time.date} ${time.time}`,
      },
      sun: {
        sunrise: sun.sunrise,
        sunset: sun.sunset,
      },
      tithi: {
        number: tithi.number,
        name: tithi.name,
        paksha: tithi.paksha,
        completesAt: tithi.completes_at,
        leftPercentage:
          tithi.left_precentage ?? tithi.left_percentage,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch aggregated data",
      source: err.config?.url,
      status: err.response?.status,
      details: err.response?.data || err.message,
    });
  }
});

module.exports = app;