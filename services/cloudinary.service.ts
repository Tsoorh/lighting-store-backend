import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_KEY,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const cloudinaryService = {
  removeImage
}

async function removeImage(publicId: string) {
  try {
    const res = await cloudinary.uploader.destroy(publicId)
    return res
  } catch (err) {
    console.error('Failed to remove image from Cloudinary', err)
    throw err
  }
}
