import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";

// Helper function to wrap the stream upload in a Promise
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    // 1. Create the upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "profiles" },
      (error, result) => {
        if (error) {
          // 2. Properly reject the promise on error
          return reject(error);
        }
        // 3. Resolve the promise with the secure URL on success
        resolve(result.secure_url);
      }
    );
    
    // 4. Write the file buffer to the stream and close it
    uploadStream.end(fileBuffer);
  });
};

export const completeProfile = async (req, res) => {
  let avatarUrl = null; // Initialize to null

  try {
    // Check if a file was uploaded and await the upload
    if (req.file) {
      // 5. Await the promise to ensure the upload is complete
      avatarUrl = await uploadToCloudinary(req.file.buffer);
    }

    // 6. Update the user in the database
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        avatar: avatarUrl,
        bio: req.body.bio,
        profileCompleted: true,
      },
      { new: true }
    );
    
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // 7. Send the successful response
    res.json(user);

  }  catch (error) {
    // 8. CATCH BLOCK: Handles all errors (Cloudinary or Database)
    console.error("Profile update failed:", error);
    
    // Create a variable to hold the error text to check against
    let errorMessageText = (typeof error === 'string') ? error : error.message;

    // Defensively check if errorMessageText exists before calling .includes()
    if (errorMessageText && errorMessageText.includes("Must supply api_key")) {
        return res.status(500).json({ 
            message: "Server Configuration Error: Cloudinary API Key is missing or invalid. Check .env file and server startup.",
        });
    }

    // Send a generic error response for all other issues
    res.status(500).json({ 
        message: "Failed to complete profile update.",
        details: error.message // Use error.message here, but ensure the error handling above is robust
    });
  }
};