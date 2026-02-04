import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import toStream = require('streamifier'); // Thư viện chuyển buffer thành stream
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                { folder: 'products' }, // Tự động tạo folder 'products' trên Cloudinary
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                },
            );

            // Đẩy file buffer vào luồng upload
            toStream.createReadStream(file.buffer).pipe(upload);
        });
    }
}