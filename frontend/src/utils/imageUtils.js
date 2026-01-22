/**
 * Compresses and resizes an image file to a Base64 string.
 * @param {File} file - The image file to process.
 * @param {object} options - Options for resizing and compression.
 * @param {number} [options.maxWidth=800] - Maximum width.
 * @param {number} [options.maxHeight=800] - Maximum height.
 * @param {number} [options.quality=0.7] - Quality (0 to 1).
 * @returns {Promise<string>} - The Base64 encoded string.
 */
export const compressImage = (file, options = {}) => {
    return new Promise((resolve, reject) => {
        const { maxWidth = 800, maxHeight = 800, quality = 0.7 } = options;
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress and return Base64
                resolve(canvas.toDataURL('image/jpeg', quality));
            };

            img.onerror = (err) => {
                reject(err);
            };
        };

        reader.onerror = (err) => {
            reject(err);
        };
    });
};
