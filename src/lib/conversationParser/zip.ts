export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_EOCD = 0x06064b50;

function readUint16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readUint32(data: Uint8Array, offset: number): number {
  return (data[offset]
    | (data[offset + 1] << 8)
    | (data[offset + 2] << 16)
    | (data[offset + 3] << 24)) >>> 0;
}

function findEndOfCentralDirectory(data: Uint8Array): number {
  const min = Math.max(0, data.length - (65535 + 22));
  for (let offset = data.length - 22; offset >= min; offset -= 1) {
    if (readUint32(data, offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  return -1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Decoder = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!Decoder) {
    throw new Error('this ZIP is compressed and this runtime cannot inflate it');
  }
  const stream = new Decoder('deflate-raw');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const writePromise = (async () => {
    await writer.write(data as unknown as BufferSource);
    await writer.close();
  })();
  const chunks: Uint8Array[] = [];
  const readPromise = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  })();
  await Promise.all([writePromise, readPromise]);
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  return output;
}

export function isZipBytes(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  const signature = readUint32(data, 0);
  return signature === LOCAL_FILE_HEADER || signature === END_OF_CENTRAL_DIRECTORY || signature === 0x08074b50;
}

export async function unzipArchive(data: Uint8Array): Promise<ZipEntry[]> {
  if (data.length >= 4 && readUint32(data, 0) === ZIP64_EOCD) {
    throw new Error('ZIP64 archives are not supported. Unzip it and upload the conversation file directly');
  }
  const eocd = findEndOfCentralDirectory(data);
  if (eocd < 0) throw new Error('the ZIP archive is missing its directory');

  const entryCount = readUint16(data, eocd + 10);
  const directoryOffset = readUint32(data, eocd + 16);
  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    throw new Error('ZIP64 archives are not supported. Unzip it and upload the conversation file directly');
  }

  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  const decoder = new TextDecoder('utf-8', { fatal: false });

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > data.length || readUint32(data, cursor) !== CENTRAL_DIRECTORY) {
      throw new Error('the ZIP directory is invalid');
    }
    const flags = readUint16(data, cursor + 8);
    const method = readUint16(data, cursor + 10);
    const compressedSize = readUint32(data, cursor + 20);
    const filenameLength = readUint16(data, cursor + 28);
    const extraLength = readUint16(data, cursor + 30);
    const commentLength = readUint16(data, cursor + 32);
    const localOffset = readUint32(data, cursor + 42);
    const name = decoder.decode(data.subarray(cursor + 46, cursor + 46 + filenameLength));
    cursor += 46 + filenameLength + extraLength + commentLength;

    if (!name || name.endsWith('/')) continue;
    if ((flags & 0x1) !== 0) {
      throw new Error('password-protected ZIPs are not supported');
    }
    if (localOffset + 30 > data.length || readUint32(data, localOffset) !== LOCAL_FILE_HEADER) {
      throw new Error(`couldn't read ${name} inside the ZIP`);
    }
    const localNameLength = readUint16(data, localOffset + 26);
    const localExtraLength = readUint16(data, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > data.length) throw new Error(`couldn't read ${name} inside the ZIP`);
    const compressed = data.subarray(dataStart, dataEnd);

    let uncompressed: Uint8Array;
    if (method === 0) uncompressed = compressed;
    else if (method === 8) uncompressed = await inflateRaw(compressed);
    else throw new Error(`${name} uses an unsupported ZIP compression method`);

    entries.push({ name, data: uncompressed });
  }

  return entries;
}
