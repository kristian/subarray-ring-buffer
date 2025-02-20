# `subarray-ring-buffer`

`subarray-ring-buffer` is a very efficient ring / circular (binary) buffer implementation, based on Node.js `Buffer` and the very popular [`bl` *(BufferList)*](https://www.npmjs.com/package/bl) library. As a ring buffer, `subarray-ring-buffer` offers constant time, lock-free data access and efficient memory usage by reusing a fixed-size buffer, making it ideal for high-performance streaming or real-time applications. By utilizing Node.js's `Buffer.subarray()`, it enables fast, zero-copy access to a rolling window of bytes, making it ideal for applications requiring continuous data processing with minimal overhead.

### Inner workings

Let's initialize a ring buffer of 5 bytes: 

```js
import { RingBuffer } from 'subarray-ring-buffer';

const ringBuffer = new RingBuffer(5);
```

This creates a internal buffer of a fixed-size:

```hex
00 00 00 00 00
```

Now we can start writing to the ring buffer with the `write(chunk)` method (note that the ring buffer itself ***does not*** comply to the `Buffer` interface):

```js
const buffer = ringBuffer.write(Buffer.from('abcdef', 'hex'));
```

This will result in two things, one it writes the data to the start of the internal buffer:

```hex
ab cd ef 00 00
```

Two, it will return a `Buffer.subarray()` of the memory area, that the chunk has been written to:

```js
console.log(buffer.toString('hex')); // abcdef
```

Now let's see what happens if we continue to write into the ring buffer:

```js
const buffer2 = ringBuffer.write(Buffer.from('123456', 'hex'));
```

Also the second call succeeded, however, due to the nature of the ring buffer, there is no space left, to fit the whole chunk, so it will wrap around, overriding old data:

```hex
56 cd ef 12 34
```

See how `ab` of the first buffer was overridden with `56` of our second buffer? If we now print both buffers, this will also show:

```js
console.log(buffer.toString('hex')); // 56cdef
console.log(buffer2.toString('hex')); // 123456
```

Notice how for the second buffer, even though in memory the string is split between the end and beginning of the ring buffer, the `buffer2` object still contains the correct string? This is due to the fact, that `subarray-ring-buffer` will automatically return a `BufferList` in case the ring buffer overflows and wraps around, allowing seamless access to the data. This is also a great way to determine when the ring buffer overflowed:

```js
if (Buffer.isBuffer(buffer)) {
    // no overflow
} else {
    // overflow (or invalid memory, see "safe" mode below)
}
```

### Why use a ring buffer?

Now you might ask yourself, why would I want to store a `Buffer` that, if I am not careful (more on that later) overrides itself and potentially causes me to read invalid data? Well imagine this scenario:

You have a constant stream of data, say a serial port, that you would like to process asynchronously. Your application should be able to handle a certain amount of back-pressure, that is, the amount of data, that is being held back for the time your application takes to process the data. The serial port however should continue sending right away. What do you do?

You get `chunk` data from the serial port. Just putting the `chunk` into a queue for later processing (e.g. a simple array `const queue = []; queue.push(chunk);`) won't suffice, as by the time your application starts processing the queue, the memory area of the `chunk` might already be re-used by Node.js / your serial port library. Generally it is never safe to process chunks you retrieve from a stream at a later point in time. So, what now? Well, just copy the data!... Well, yes, however this will cause quite some heap allocation doing: `Buffer.from(chunk)` for every chunk of data you retrieve.

Wouldn't it be nice, to have a library, that guarantees that your application only allocates a fix amount of data? This is where `subarray-ring-buffer`. With the size of the buffer you can control, how much back pressure your application should be able to handle and due to the internal nature of a ring buffer, the buffer will never allocate memory that needs to be cleaned up in an expensive garbage collection run at some point in time.

## API

Create a new ring buffer of a given size:

```js
import { RingBuffer } from 'subarray-ring-buffer';

const ringBuffer = new RingBuffer(10);
```

### Strict Mode

Enabled by passing `true` as a second constructor argument:

```js
const strictRingBuffer = new RingBuffer(10, true);
```

Strict mode causes the ring buffer to throw an exception in case a chunk is written to the buffer, that exceeds it's total size. Say the ring buffer can hold 10 bytes and you try to write 12. Note that if you try to write the 12 bytes in two 6 byte chunks, the ring buffer would *not* throw an exception and instead wrap the 6 bytes around to the start of the buffer.

### Safe Mode

Enabled by passing `true` as a third constructor argument:

```js
const safeRingBuffer = new RingBuffer(10, false, true);
```

This results in returning a safe sub-array every time you write a chunk to the ring buffer. What makes the returned sub-array safe to use is, that in case data was overridden, due to the ring buffer wrapping around, say you already wrote the 12 bytes, as before, the sub-arrays that you can no longer access, are replaced by an empty buffer instead. This way your application will never access invalid data, however data might be lost due to the nature of the safe ring buffer.

Note that this is achieved by the use of [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) objects to the returned sub-arrays, causing a slightly higher memory footprint than non-safe mode.

### Strict + Safe Mode

You may also combine strict and safe mode, by setting both boolean arguments to `true`:

```js
const strictSafeRingBuffer = new RingBuffer(10, true, true);
```

This will cause an error, in case your application tries to access an already invalid sub-array chunk of data.

## Author

`subarray-ring-buffer` by [Kristian Kraljić](https://kra.lc/).

## Bugs

Please file any questions / issues [on Github](https://github.com/kristian/subarray-ring-buffer/issues).

## License

This library is licensed under the [Apache 2.0](LICENSE) license.
