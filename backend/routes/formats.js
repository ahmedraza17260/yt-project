const express = require("express");
const router = express.Router();
const { getFormatsPost, getFormatsGet } = require("../controllers/formatController");

// POST /api/formats - for frontend requests
router.post("/", getFormatsPost);

// GET /api/formats - for direct browser access or testing
router.get("/", getFormatsGet);

module.exports = router;
