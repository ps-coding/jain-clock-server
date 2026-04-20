require("dotenv").config();

const process = require("process");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env["PORT"] || 3000;

const FREE_ASTROLOGY_HOST = "json.freeastrologyapi.com";
const FREE_ASTROLOGY_PORT = 443;
const FREE_ASTROLOGY_HTTP_PORT = 80;
const FREE_ASTROLOGY_PATH = "/tithi-durations";
const FREE_ASTROLOGY_API_KEY = process.env["FREE_ASTROLOGY_API_KEY"];

app.use(cors());
app.use(express.json({}));

app.post("/isjain", async (req, res) => {
  try {
    
    res.json({ response });
  } catch (err) {
    console.error(err);
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}.`);
});
