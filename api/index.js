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

    const year = parseInt(time.date.split("-")[0]);
    const month = parseInt(time.date.split("-")[1]);
    const day = parseInt(time.date.split("-")[2]);

    const hour = parseInt(time.time.split(":")[0]);
    const minute = parseInt(time.time.split(":")[1]);
    const seconds = Math.ceil(parseFloat(time.time.split(":")[2]));

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
        year: year,
        month: month,
        date: day,
        hours: hour,
        minutes: minute,
        seconds: seconds,
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
        month,
        day,
        year,
        hour,
        minute,
        seconds,
      },
      sun: {
        sunrise: sun.sunrise,
        sunset: sun.sunset,
      },
      tithi,
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