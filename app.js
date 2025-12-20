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
	"https://ra-pure.rccdnetwork.org",
	// Netlify production origin (added to fix reported CORS preflight failure)
	"https://ra-pure.rccdnetwork.org",
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

// Simple health check route for uptime / debugging
app.get("/ping", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	return res.status(200).json({ status: "ok" });
});

// Global error handler — ensures CORS headers are present even on errors
app.use((err, req, res, next) => {
	// Set CORS headers on error responses as a fallback
	const origin = req.headers.origin;
	if (origin && allowedOrigins.indexOf(origin) !== -1) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	} else {
		res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
	}
	res.setHeader("Access-Control-Allow-Credentials", "true");

	// Detect Mongo duplicate key error (E11000) and return a 409 Conflict with a readable message
		if (err && (err.code === 11000 || (err.message && err.message.includes("E11000")))) {
		// Parse field name from error message if possible
		let field = "field";
		try {
			const m = err.message.match(/index: (\w+)_1 dup key: \{ :? ?(.*)\}/);
			if (m && m[1]) field = m[1];
		} catch (e) {
			/* ignore parsing errors */
		}
			const message = `Duplicate value for ${field}.`;
			// Return consistent error shape with `message` key to match controller responses
			return res.status(409).json({ message });
	}

	const status = err && err.status ? err.status : 500;
	const message = (err && err.message) || "Internal Server Error";
	// Avoid leaking stack in production
	return res.status(status).json({ error: message });
});

export default app;
