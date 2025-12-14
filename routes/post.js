import express from "express";
import { protect } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { createPost, getPosts, updatePost, deletePost, addComment, addReply, deleteComment, deleteReply } from "../controllers/post.js";

const router = express.Router();

router.post("/", protect, upload.array("images"), createPost);
router.get("/", protect, getPosts);
router.put("/:id", protect, upload.array("images"), updatePost);
router.delete("/:id", protect, deletePost);

// Comments
router.post('/:id/comments', protect, addComment);
router.post('/:postId/comments/:commentId/replies', protect, addReply);
router.delete('/:postId/comments/:commentId', protect, deleteComment);
router.delete('/:postId/comments/:commentId/replies/:replyId', protect, deleteReply);

export default router;
