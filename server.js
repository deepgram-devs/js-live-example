const express = require("express");
const http = require("http");
const { createClient } = require("@deepgram/sdk");
const dotenv = require("dotenv");
dotenv.config();

const client = createClient(process.env.DEEPGRAM_API_KEY);

const app = express();
const server = http.createServer(app);

app.use(express.static("public/"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const getTempToken = async () => {
  const { result, error } = await client.auth.grantToken();

  if (error) {
    throw error;
  }

  return result;
};

app.get("/token", async (req, res) => {
  const token = await getTempToken();

  res.json(token);
});

server.listen(3000, () => {
  console.log("listening on http://localhost:3000");
});
