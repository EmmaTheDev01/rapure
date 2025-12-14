import cloudinary from "../config/cloudinary.js";
import Post from "../models/Post.js";

export const createPost = async (req, res) => {
  try {
    const imageUrls = [];

    for (const file of req.files || []) {
      // Wrap upload_stream in a promise so we can await it
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "posts" }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(file.buffer);
      });

      imageUrls.push(result.secure_url);
    }

    const post = await Post.create({
      user: req.user.id,
      text: req.body.text,
      images: imageUrls,
      category: req.body.category || "General",
    });

    // Populate user fields before returning
    await post.populate("user", "name avatar");

    res.status(201).json(post);
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const getPosts = async (req, res) => {
  const posts = await Post.find()
    .populate("user", "name avatar")
    .populate('comments.user', 'name avatar')
    .populate('comments.replies.user', 'name avatar')
    .sort({ createdAt: -1 });

  res.json(posts);
};

// Add a comment to a post
export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = {
      user: req.user.id,
      text: req.body.text,
    };

    post.comments.push(comment);
    await post.save();

    await post.populate('comments.user', 'name avatar');
    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// Add a reply to a comment
export const addReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const reply = {
      user: req.user.id,
      text: req.body.text,
    };

    comment.replies.push(reply);
    await post.save();

    // populate the newly added reply user
    await post.populate('comments.user', 'name avatar');
    await post.populate('comments.replies.user', 'name avatar');

    res.status(201).json(comment);
  } catch (error) {
    console.error('addReply error:', error);
    res.status(500).json({ message: 'Failed to add reply' });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.user.toString() !== req.user.id.toString())
      return res.status(403).json({ message: 'Forbidden' });

    comment.remove();
    await post.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('deleteComment error:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};

// Delete a reply
export const deleteReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    if (reply.user.toString() !== req.user.id.toString())
      return res.status(403).json({ message: 'Forbidden' });

    reply.remove();
    await post.save();

    res.json({ message: 'Reply deleted' });
  } catch (error) {
    console.error('deleteReply error:', error);
    res.status(500).json({ message: 'Failed to delete reply' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // only owner can update
    if (post.user.toString() !== req.user.id.toString())
      return res.status(403).json({ message: 'Forbidden' });

    if (req.body.text) post.text = req.body.text;
    if (req.body.category) post.category = req.body.category;

    // handle additional uploaded images (append)
    for (const file of req.files || []) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "posts" }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(file.buffer);
      });
      post.images.push(result.secure_url);
    }

    await post.save();
    await post.populate('user', 'name avatar');
    res.json(post);
  } catch (error) {
    console.error('updatePost error:', error);
    res.status(500).json({ message: 'Failed to update post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.user.toString() !== req.user.id.toString())
      return res.status(403).json({ message: 'Forbidden' });

    await post.remove();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('deletePost error:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
};
