import { Buffer } from 'node:buffer';
import { BufferList } from 'bl';

const emptyBufferList = new BufferList([Buffer.allocUnsafe(0)]);

/**
 * A ring buffer that allows writing chunks of data into a fixed-size buffer returning a subarray to the data just written.
 */
export class RingBuffer {
  #buffer;
  #offset = 0;
  #strict;
  #safe;

  #totalOffset = 0; // only used in safe mode

  /**
   * Allocates a new `RingBuffer` with a internal buffer size of `size` bytes.
   *
   * @param {number} size The desired length of the new ring buffer.
   * @param {boolean} [strict=false] Check if chunks fit into the ring buffer.
   *   If set to true, chunks that exceed the size of the ring buffer will throw an error.
   *   If set to false, only the trailing `size` bytes will be kept in the ring buffer.
   * @param {boolean} [safe=false] If true, writing to the ring buffer will return a safe
   *   subarray that will throw an error if accessed after the data has been overwritten.
   */
  constructor(size, strict = false, safe = false) {
    this.#buffer = Buffer.allocUnsafe(size);
    this.#strict = strict;
    this.#safe = safe;
  }

  /**
   * Writes data of `chunk` into the ring buffer overriding the oldest data.
   *
   * @param {(Buffer|Uint8Array)} chunk The chunk to write into the ring buffer.
   * @returns {Buffer} the subarray to the data just written into the ring buffer.
   */
  write(chunk) {
    if (!this.#safe) {
      return this.#write(chunk);
    } else {
      const safeOffset = this.#totalOffset + this.#buffer.length;

      let buffer = this.#write(chunk);
      this.#totalOffset += chunk.length;
      if (!(buffer instanceof BufferList)) {
        // wrap the plain Buffer in a BufferList, as proxying array types, like Buffer/Uint8Array fails when accessing
        // properties like length because Uint8Array has internal optimizations that are not fully proxy-compatible
        buffer = new BufferList([buffer]);
      }

      return new Proxy(buffer, {
        get: (target, prop, receiver) => {
          if (this.#totalOffset > safeOffset) {
            if (this.#strict) {
              throw new Error('buffer is no longer safe to access');
            } else {
              target = emptyBufferList;
            }
          }

          return Reflect.get(target, prop, receiver);
        }
      });
    }
  }

  #write(chunk) {
    if (chunk.length > this.#buffer.length) {
      if (this.#strict) {
        throw new Error('chunk length exceeds size of ring buffer');
      }

      chunk.copy(this.#buffer, 0, chunk.length - this.#buffer.length);
      return this.#buffer;
    } else if (this.#offset + chunk.length > this.#buffer.length) {
      const remaining = this.#buffer.length - this.#offset;
      chunk.copy(this.#buffer, this.#offset, 0, remaining);
      chunk.copy(this.#buffer, 0, remaining);
      return new BufferList([
        this.#buffer.subarray(this.#offset),
        this.#buffer.subarray(0, this.#offset = chunk.length - remaining)
      ]);
    } else {
      chunk.copy(this.#buffer, this.#offset);
      return this.#buffer.subarray(this.#offset, this.#offset = this.#offset + chunk.length);
    }
  }
}
