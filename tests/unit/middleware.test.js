const errorHandler = require('../../src/middleware/error-handler');
const convertFragment = require('../../src/middleware/convert');
const Fragment = require('../../src/model/fragment');

describe('Middleware: Error Handler', () => {
    test('errorHandler should handle errors with default status', () => {
        const err = new Error('Test error');
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();
    });

    test('errorHandler should handle errors with custom status', () => {
        const err = new Error('Not found');
        err.status = 404;
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalled();
    });
});

describe('Middleware: Convert Fragment', () => {
    test('convertFragment should convert markdown to html', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'text/markdown',
            size: 20,
        });
        const data = Buffer.from('# Hello\n\nThis is **markdown**');
        const result = await convertFragment(fragment, data, 'html');

        expect(result.contentType).toBe('text/html');
        expect(result.convertedData.toString()).toContain('<h1>');
        expect(result.convertedData.toString()).toContain('<strong>');
    });

    test('convertFragment should convert json to text', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'application/json',
            size: 20,
        });
        const data = Buffer.from(JSON.stringify({ name: 'test', value: 123 }));
        const result = await convertFragment(fragment, data, 'txt');

        expect(result.contentType).toBe('text/plain');
        expect(result.convertedData.toString()).toContain('name');
        expect(result.convertedData.toString()).toContain('test');
    });

    test('convertFragment should handle markdown to markdown', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'text/markdown',
            size: 7,
        });
        const data = Buffer.from('# Title');
        const result = await convertFragment(fragment, data, 'md');

        expect(result.contentType).toBe('text/markdown');
        expect(result.convertedData.toString()).toBe('# Title');
    });

    test('convertFragment should handle json to json', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'application/json',
            size: 16,
        });
        const data = Buffer.from(JSON.stringify({ test: 'data' }));
        const result = await convertFragment(fragment, data, 'json');

        expect(result.contentType).toBe('application/json');
    });

    test('convertFragment should handle text/plain to text/plain', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'text/plain',
            size: 10,
        });
        const data = Buffer.from('Plain text');
        const result = await convertFragment(fragment, data, 'txt');

        expect(result.contentType).toBe('text/plain');
        expect(result.convertedData.toString()).toBe('Plain text');
    });

    test('convertFragment should throw error for unsupported conversion', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'text/plain',
            size: 10,
        });
        const data = Buffer.from('Plain text');

        try {
            await convertFragment(fragment, data, 'html');
            fail('Should have thrown an error');
        } catch (err) {
            expect(err.message).toContain('Unsupported');
        }
    });

    test('convertFragment should handle image conversion png to jpeg', async () => {
        const fragment = new Fragment({
            id: 'test',
            ownerId: 'test-owner',
            type: 'image/png',
            size: 100,
        });
        // Create a minimal PNG buffer (1x1 transparent PNG)
        const pngBuffer = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
            0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
        ]);

        const result = await convertFragment(fragment, pngBuffer, 'jpeg');
        expect(result.contentType).toBe('image/jpeg');
        expect(Buffer.isBuffer(result.convertedData)).toBe(true);
    });
});
