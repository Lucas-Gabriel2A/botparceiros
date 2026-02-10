
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export default cloudinary;

export const uploadImage = async (file: File | string, folder: string = "corebot/banners") => {
    try {
        // If it's a base64 string or file path
        if (typeof file === 'string') {
            const result = await cloudinary.uploader.upload(file, {
                folder,
                resource_type: 'image'
            });
            return result.secure_url;
        }

        // If it's a File object (from client-side), we'd typically use signed uploads
        // For server actions, we might need to convert File to Buffer or base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataURI = `data:${file.type};base64,${base64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
            folder,
            resource_type: 'image'
        });

        return result.secure_url;

    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw new Error("Failed to upload image");
    }
};
