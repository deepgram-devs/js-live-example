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

const getProjectId = async () => {
  const { result, error } = await client.manage.getProjects();

  if (error) {
    throw error;
  }

  return result.projects[0].project_id;
};

const getTempApiKey = async (projectId) => {
  const { result, error } = await client.manage.createProjectKey(projectId, {
    comment: "short lived",
    scopes: ["usage:write"],
    time_to_live_in_seconds: 20,
  });

  if (error) {
    throw error;
  }

  return result;
};

app.get("/key", async (req, res) => {
  const projectId = await getProjectId();
  const key = await getTempApiKey(projectId);

  res.json(key);
});

server.listen(3000, () => {
  console.log("listening on http://localhost:3000");
});
