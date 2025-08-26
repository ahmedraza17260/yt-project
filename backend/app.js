const express = require("express");
const cors = require("cors");
const path = require("path");

const formatsRoute = require("./routes/formats");
const downloadRoute = require("./routes/download");

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? process.env.FRONTEND_URL || "http://localhost:3000" 
    : "http://localhost:3000",
  credentials: true
}));

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use("/api/formats", formatsRoute);
app.use("/api/download", downloadRoute);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Catch-all handler for SPA routing - must be last
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === "production" 
      ? "Internal server error" 
      : error.message 
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app; // For testing
