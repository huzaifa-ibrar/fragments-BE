const { v4: uuidv4 } = require('uuid');
const data = require('./data');
const logger = require('../logger');

class Fragment {
  constructor({ id, ownerId, type, size = 0, created = new Date().toISOString(), updated }) {
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');
    if (typeof size !== 'number' || size < 0) throw new Error('size must be number >= 0');
    if (!Fragment.isSupportedType(type)) throw new Error('Unsupported type');

    this.id = id || uuidv4();
    this.ownerId = ownerId;
    this.type = type;
    this.size = size;
    this.created = created;
    this.updated = updated || created;
  }

  static validTypes = ['text/plain', 'text/markdown', 'application/json', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  static isSupportedType(type) {
    return Fragment.validTypes.includes(type.split(';')[0]);
  }

  get mimeType() {
    return this.type.split(';')[0];
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  get isJson() {
    return this.mimeType === 'application/json';
  }

  get isMarkdown() {
    return this.mimeType === 'text/markdown';
  }

  get isImage() {
    return this.mimeType.startsWith('image/');
  }

  get formats() {
    const formats = [this.mimeType];

    // Add conversion formats based on type
    if (this.isMarkdown) {
      formats.push('text/html');
    }
    if (this.isJson) {
      formats.push('text/plain');
    }
    if (this.isImage) {
      // All image types can be converted to other image formats
      const allImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      formats.push(...allImageTypes.filter(type => type !== this.mimeType));
    }

    return formats;
  }

  // --- Instance Methods ---
  async save() {
    this.updated = new Date().toISOString();
    // First, get existing data so we don't lose it
    let existingData = null;
    try {
      existingData = await data.readFragmentData(this.ownerId, this.id);
    } catch (err) {
      // Fragment data might not exist yet (new fragment)
    }

    await data.writeFragment(this.ownerId, this);

    // Re-save the data if it existed
    if (existingData) {
      await data.writeFragmentData(this.ownerId, this.id, existingData);
    }
  }

  async setData(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error('Data must be a Buffer');
    this.size = buffer.length;
    this.updated = new Date().toISOString();
    await data.writeFragmentData(this.ownerId, this.id, buffer);
  }

  async getData() {
    return data.readFragmentData(this.ownerId, this.id);
  }

  // --- Static Helpers ---
  static async byId(ownerId, id) {
    const meta = await data.readFragment(ownerId, id);
    if (!meta) return null;
    return new Fragment(meta);
  }

  static async byUser(ownerId, full = false) {
    const ids = await data.listFragments(ownerId);
    if (!full) return ids;
    const frags = await Promise.all(
      ids.map(async (id) => {
        const meta = await data.readFragment(ownerId, id);
        return new Fragment(meta);
      })
    );
    return frags;
  }

  static async delete(ownerId, id) {
    await data.deleteFragment(ownerId, id);
  }

  static async create(ownerId, type, buffer) {
    if (!Fragment.isSupportedType(type)) {
      const err = new Error('Unsupported type');
      err.status = 415;
      throw err;
    }
    const frag = new Fragment({ ownerId, type, size: Buffer.isBuffer(buffer) ? buffer.length : 0 });
    await frag.save();
    if (Buffer.isBuffer(buffer)) await frag.setData(buffer);
    logger.info({ id: frag.id, ownerId }, 'fragment created');
    return frag;
  }

  static async read(ownerId, id) {
    const frag = await data.readFragment(ownerId, id);
    if (!frag) {
      const err = new Error('Not found');
      err.status = 404;
      throw err;
    }
    return new Fragment(frag);
  }

  static async readData(ownerId, id) {
    const buf = await data.readFragmentData(ownerId, id);
    if (!buf) {
      const err = new Error('Not found');
      err.status = 404;
      throw err;
    }
    return buf;
  }

  static async list(ownerId) {
    return data.listFragments(ownerId);
  }
}

module.exports = Fragment;
