require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dns = require("dns");
const fs = require("fs");
const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

// Function to manage data storage
function manageData(action, input) {
  const filePath = "./public/data.json";
  let data = [];

  if (fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath);
    if (file.length > 0) {
      data = JSON.parse(file);
    }
  }

  if (action === "save" && input) {
    const existingUrls = data.map((entry) => entry.original_url);
    if (!existingUrls.includes(input.original_url)) {
      data.push(input);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
  } else if (action === "load") {
    return data;
  }
}

// Generate a random short URL
function generateShortUrl() {
  const data = manageData("load");
  let shortUrl = Math.ceil(Math.random() * 1000);

  if (data.length > 0) {
    const existingShortUrls = data.map((entry) => entry.short_url);
    while (existingShortUrls.includes(shortUrl)) {
      shortUrl = Math.ceil(Math.random() * 1000);
    }
  }

  return shortUrl;
}

// Middleware to handle URL shortening
app.post("/api/shorturl", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.json({ error: "invalid url" });
  }

  const domain = url.match(
    /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/gim
  );
  if (!domain) {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(domain[0].replace(/^https?:\/\//i, ""), (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    } else {
      const shortUrl = generateShortUrl();
      const data = { original_url: url, short_url: shortUrl };
      manageData("save", data);
      return res.json(data);
    }
  });
});

// Middleware to handle redirection
app.get("/api/shorturl/:shortUrl", (req, res) => {
  const shortUrl = parseInt(req.params.shortUrl);
  const data = manageData("load");
  const entry = data.find((item) => item.short_url === shortUrl);

  if (entry) {
    res.redirect(entry.original_url);
  } else {
    res.json({ error: "short url not found" });
  }
});

app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
