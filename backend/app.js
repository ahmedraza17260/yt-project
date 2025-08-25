const express = require("express");
const cors = require("cors");
const path = require("path");

const formatsRoute = require("./routes/formats");
const downloadRoute = require("./routes/download");

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/formats", formatsRoute);
app.use("/api/download", downloadRoute);

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
