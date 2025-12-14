import express from "express";
import { protect } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { completeProfile } from "../controllers/profile.js";

const router = express.Router();

router.put("/", protect, upload.single("avatar"), completeProfile);

export default router;
