const MarkdownIt = require('markdown-it');
const sharp = require('sharp');
const md = new MarkdownIt();

/**
 * Convert a fragment's data to another format if supported.
 * @param {Fragment} fragment - The fragment instance
 * @param {Buffer} data - Fragment data as Buffer
 * @param {string} extension - The target extension (e.g., 'html', 'txt')
 * @returns {Promise<{ convertedData: Buffer, contentType: string }>}
 */
async function convertFragment(fragment, data, extension) {
    console.log('🧠 convertFragment called with:', {
        type: fragment.mimeType,
        isJson: fragment.isJson,
        isMarkdown: fragment.isMarkdown,
        isImage: fragment.isImage,
        extension,
    });

    // If no extension provided, return original data
    if (!extension) {
        return { convertedData: data, contentType: fragment.mimeType };
    }

    const targetExt = extension.toLowerCase();

    // === MARKDOWN CONVERSIONS ===
    if (fragment.isMarkdown) {
        if (targetExt === 'html') {
            try {
                const htmlContent = md.render(data.toString());
                return {
                    convertedData: Buffer.from(htmlContent),
                    contentType: 'text/html',
                };
            } catch (err) {
                console.error('❌ Markdown conversion error:', err);
                throw new Error(`Failed to convert Markdown to HTML: ${err.message}`);
            }
        }
        // Return original markdown for .md or any other extension
        if (targetExt === 'md' || targetExt === 'markdown') {
            return {
                convertedData: data,
                contentType: 'text/markdown',
            };
        }
    }

    // === JSON CONVERSIONS ===
    if (fragment.isJson) {
        if (targetExt === 'txt') {
            const text = data.toString();
            try {
                // Pretty print the JSON if it's valid JSON
                let parsedData;
                try {
                    parsedData = JSON.parse(text);
                } catch {
                    // If parsing fails, use the raw text
                    parsedData = text;
                }

                const prettyText = typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2);
                return {
                    convertedData: Buffer.from(prettyText),
                    contentType: 'text/plain',
                };
            } catch (err) {
                // If all conversion attempts fail, return raw text
                return {
                    convertedData: Buffer.from(text),
                    contentType: 'text/plain',
                };
            }
        }
        // Return original JSON for .json or any other extension
        if (targetExt === 'json') {
            return {
                convertedData: data,
                contentType: 'application/json',
            };
        }
    }

    // === TEXT/PLAIN CONVERSIONS ===
    if (fragment.mimeType === 'text/plain') {
        if (targetExt === 'txt') {
            return {
                convertedData: data,
                contentType: 'text/plain',
            };
        }
    }

    // === IMAGE CONVERSIONS ===
    if (fragment.isImage) {
        try {
            const targetFormat = targetExt.toLowerCase();
            const supportedFormats = ['png', 'jpeg', 'jpg', 'webp', 'gif'];

            if (!supportedFormats.includes(targetFormat)) {
                throw new Error(`Unsupported image format: ${targetFormat}`);
            }

            // Convert jpg to jpeg for sharp
            const sharpFormat = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
            const convertedBuffer = await sharp(data).toFormat(sharpFormat).toBuffer();

            return {
                convertedData: convertedBuffer,
                contentType: `image/${sharpFormat === 'jpeg' ? 'jpeg' : sharpFormat}`,
            };
        } catch (err) {
            console.error('❌ Image conversion error:', err);
            throw new Error(`Failed to convert image: ${err.message}`);
        }
    }

    // === Unsupported conversion ===
    console.warn(
        `⚠️ Unsupported conversion requested: ${fragment.mimeType} → ${targetExt}`
    );
    throw new Error(`Unsupported conversion: ${fragment.mimeType} to ${targetExt}`);
}

module.exports = convertFragment;
