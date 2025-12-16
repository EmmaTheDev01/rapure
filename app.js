import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import postRoutes from "./routes/post.js";

const app = express();

// Load environment variables before configuring middleware
dotenv.config();

// Configure CORS: allow localhost (dev) and the deployed origin.
const allowedOrigins = [
	process.env.CLIENT_URL || "http://localhost:8080",
	process.env.PROD_CLIENT_URL || "https://rapureapp.onrender.com",
	// added production client origin
	"https://farmersforum.nrtlify.app",
];
app.use(
	cors({
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps or curl)
			if (!origin) return callback(null, true);
			if (allowedOrigins.indexOf(origin) !== -1) {
				return callback(null, true);
			}
			return callback(new Error("CORS policy: This origin is not allowed."), false);
		},
		credentials: true,
	})
);

app.use(helmet());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/posts", postRoutes);

export default app;
