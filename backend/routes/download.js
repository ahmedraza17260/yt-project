const express = require("express");
const router = express.Router();
const { downloadVideoPostController, downloadVideoGetController } = require("../controllers/downloadController");

// POST /api/download - for frontend requests
router.post("/", downloadVideoPostController);

// GET /api/download - for direct browser access
router.get("/", downloadVideoGetController);

module.exports = router;
