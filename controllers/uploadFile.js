const cloudinary = require('cloudinary').v2
const fs = require('fs');

const uploadBlogImage = async (req, res) => {
    const blogImage = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
        use_filename: true,
        folder: "AllBlogsImage"
    })

    fs.unlinkSync(req.files.image.tempFilePath)

    res.status(200).json({url: blogImage.secure_url})

    console.log(blogImage.secure_url);
}

const uploadUserImage = (req, res) => {
    res.status(200).json({message: "Upload file successfully"});
    
}

module.exports = {
    uploadBlogImage,
    uploadUserImage
}