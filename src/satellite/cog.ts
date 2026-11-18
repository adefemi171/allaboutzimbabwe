// A part of a cloud-optimised GeoTIFF, fetched on its own.
//
// The reference site reads these with the geotiff package. This site does
// not carry that package, so this reads the one layout the Sentinel-2
// archive uses for its true-colour pictures and refuses anything else:
// a classic (not Big) TIFF whose first image is the full picture, cut into
// tiles of 8-bit red, green and blue, deflated, with or without the
// horizontal predictor. Checked on scenes from 2017 to 2026.

const TAG = {
  width: 256,
  height: 257,
  bits: 258,
  compression: 259,
  samples: 277,
  planar: 284,
  predictor: 317,
  tileWidth: 322,
  tileHeight: 323,
  tileOffsets: 324,
  tileSizes: 325,
  pixelScale: 33550,
  tiePoint: 33922,
} as const;

/** Bytes per value of the TIFF field types this reads: short, long and double. */
const TYPE_SIZE: Record<number, number> = { 3: 2, 4: 4, 12: 8 };

/** How much of the start of the file to ask for: the header and its tables fit in a few kB. */
const HEAD_BYTES = 16384;

export interface Cog {
  width: number;
  height: number;
  /** Map coordinates of the top left corner, and the size of a pixel. */
  origin: [number, number];
  scale: number;
  /** Side of the squares the picture is stored in, which are fetched whole. */
  tile: [number, number];
  /** A square of the picture as red, green, blue bytes, row by row. */
  read(x0: number, y0: number, size: number): Promise<Uint8Array>;
}

async function range(url: string, from: number, length: number): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: { Range: `bytes=${from}-${from + length - 1}` },
  });
  // Anything but "partial content" would be the whole picture, some 200 MB.
  if (response.status !== 206) {
    void response.body?.cancel();
    throw new Error(`No part of ${url} (${response.status})`);
  }
  return response.arrayBuffer();
}

async function inflate(bytes: ArrayBuffer): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function openCog(url: string): Promise<Cog> {
  const head = await range(url, 0, HEAD_BYTES);
  const view = new DataView(head);
  const mark = view.getUint16(0);
  const little = mark === 0x4949;
  if ((!little && mark !== 0x4d4d) || view.getUint16(2, little) !== 42) {
    throw new Error("Not a TIFF this can read");
  }

  // The first directory is the picture at full detail.
  const directory = view.getUint32(4, little);
  const fields = new Map<number, { type: number; count: number; at: number }>();
  const entries = view.getUint16(directory, little);
  for (let i = 0; i < entries; i++) {
    const entry = directory + 2 + i * 12;
    const type = view.getUint16(entry + 2, little);
    const count = view.getUint32(entry + 4, little);
    // Up to four bytes sit in the entry itself; more are pointed at.
    const inline = (TYPE_SIZE[type] ?? 1) * count <= 4;
    fields.set(view.getUint16(entry, little), {
      type,
      count,
      at: inline ? entry + 8 : view.getUint32(entry + 8, little),
    });
  }

  const values = async (tag: number): Promise<number[]> => {
    const field = fields.get(tag);
    const size = field && TYPE_SIZE[field.type];
    if (!field || !size) return [];
    const length = size * field.count;
    const inHead = field.at + length <= head.byteLength;
    const data = inHead ? view : new DataView(await range(url, field.at, length));
    const start = inHead ? field.at : 0;
    return Array.from({ length: field.count }, (_, i) =>
      size === 2
        ? data.getUint16(start + i * 2, little)
        : size === 4
          ? data.getUint32(start + i * 4, little)
          : data.getFloat64(start + i * 8, little),
    );
  };
  const value = async (tag: number, otherwise: number) => (await values(tag))[0] ?? otherwise;

  const [width, height, samples, compression, planar, predictor, tileWidth, tileHeight] =
    await Promise.all([
      value(TAG.width, 0),
      value(TAG.height, 0),
      value(TAG.samples, 1),
      value(TAG.compression, 1),
      value(TAG.planar, 1),
      value(TAG.predictor, 1),
      value(TAG.tileWidth, 0),
      value(TAG.tileHeight, 0),
    ]);
  const [bits, offsets, sizes, pixel, tie] = await Promise.all([
    values(TAG.bits),
    values(TAG.tileOffsets),
    values(TAG.tileSizes),
    values(TAG.pixelScale),
    values(TAG.tiePoint),
  ]);
  const deflated = compression === 8 || compression === 32946;
  if (
    !width ||
    !height ||
    !tileWidth ||
    !tileHeight ||
    samples < 3 ||
    planar !== 1 ||
    bits.some((depth) => depth !== 8) ||
    (!deflated && compression !== 1) ||
    predictor > 2 ||
    pixel.length < 2 ||
    tie.length < 6
  ) {
    throw new Error("Not a picture laid out as this reader expects");
  }

  const across = Math.ceil(width / tileWidth);
  const stride = tileWidth * samples;

  /** One tile as rows of samples, or null where the file holds none. */
  const tile = async (index: number): Promise<Uint8Array | null> => {
    if (!sizes[index]) return null;
    const packed = await range(url, offsets[index], sizes[index]);
    const data = deflated ? await inflate(packed) : new Uint8Array(packed);
    if (data.length < stride * tileHeight) throw new Error("A tile came up short");
    if (predictor === 2) {
      // Each sample was stored as its difference from the one to its left.
      for (let row = 0; row < tileHeight; row++) {
        const end = (row + 1) * stride;
        for (let i = row * stride + samples; i < end; i++) data[i] += data[i - samples];
      }
    }
    return data;
  };

  return {
    width,
    height,
    origin: [tie[3] - tie[0] * pixel[0], tie[4] + tie[1] * pixel[1]],
    scale: pixel[0],
    tile: [tileWidth, tileHeight],
    async read(x0, y0, size) {
      const out = new Uint8Array(size * size * 3);
      const jobs: Promise<void>[] = [];
      for (let ty = Math.floor(y0 / tileHeight); ty * tileHeight < y0 + size; ty++) {
        for (let tx = Math.floor(x0 / tileWidth); tx * tileWidth < x0 + size; tx++) {
          jobs.push(
            tile(ty * across + tx).then((data) => {
              if (!data) return;
              // The part of this tile that lies inside the square.
              const left = Math.max(x0, tx * tileWidth);
              const right = Math.min(x0 + size, (tx + 1) * tileWidth);
              const top = Math.max(y0, ty * tileHeight);
              const bottom = Math.min(y0 + size, (ty + 1) * tileHeight);
              for (let y = top; y < bottom; y++) {
                let from = (y - ty * tileHeight) * stride + (left - tx * tileWidth) * samples;
                let to = ((y - y0) * size + (left - x0)) * 3;
                for (let x = left; x < right; x++, from += samples, to += 3) {
                  out[to] = data[from];
                  out[to + 1] = data[from + 1];
                  out[to + 2] = data[from + 2];
                }
              }
            }),
          );
        }
      }
      await Promise.all(jobs);
      return out;
    },
  };
}
