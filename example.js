import { RingBuffer } from './index.js';

// initialize a ring buffer of 10 bytes, meaning you can write 10 bytes, before the it will start wrapping
const ringBuffer = new RingBuffer(10);

const buffer1 = ringBuffer.write(Buffer.from('abcdef', 'hex'));
console.log('1', buffer1.toString('hex'));
const buffer2 = ringBuffer.write(Buffer.from('123456', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'));
const buffer3 = ringBuffer.write(Buffer.from('7890fe', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'), '3', buffer3.toString('hex'));
// so far so good, all buffers fit into the ring buffer, but now it will start to overflow:
const buffer4 = ringBuffer.write(Buffer.from('dcba09', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'), '3', buffer3.toString('hex'), '4', buffer4.toString('hex'));
// buffer1 now no longer contains the expected data 'abcdef', but 'ba09ef', as the first 2 bytes were overwritten

// if we continue, the ring buffer will 'wrap around' again. in our example (as we always write 3 bytes) only the last 3 buffers contain the expected data
const buffer5 = ringBuffer.write(Buffer.from('876543', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'), '3', buffer3.toString('hex'), '4', buffer4.toString('hex'), '5', buffer5.toString('hex'));
const buffer6 = ringBuffer.write(Buffer.from('21abcd', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'), '3', buffer3.toString('hex'), '4', buffer4.toString('hex'), '5', buffer5.toString('hex'), '6', buffer6.toString('hex'));
const buffer7 = ringBuffer.write(Buffer.from('ef1234', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'), '3', buffer3.toString('hex'), '4', buffer4.toString('hex'), '5', buffer5.toString('hex'), '6', buffer6.toString('hex'), '7', buffer7.toString('hex'));
const buffer8 = ringBuffer.write(Buffer.from('567890', 'hex'));
console.log('1', buffer1.toString('hex'), '2', buffer2.toString('hex'), '3', buffer3.toString('hex'), '4', buffer4.toString('hex'), '5', buffer5.toString('hex'), '6', buffer6.toString('hex'), '7', buffer7.toString('hex'), '8', buffer8.toString('hex'));

// in case a single chunk exceeds the whole size of the ring buffer, only the trailing bytes that fit into the ring buffer will be kept
const rest = ringBuffer.write(Buffer.from('abcdef12345678900987654321fedcba', 'hex'));
console.log('rest', rest);

// let's repeat the previous example, but this time we change the behavior of the ring buffer to be strict
const strictRingBuffer = new RingBuffer(10, true);

// the strict ring buffer will behave the same if we write normal chunks to it
console.log('strict', strictRingBuffer.write(Buffer.from('1234567890abcdeffedc', 'hex')));

// however if we try to write a chunk that exceeds the size of the ring buffer, it will throw an error
try {
  strictRingBuffer.write(Buffer.from('1234567890abcdeffedcba', 'hex'));
} catch (err) {
  console.error(err.message);
}

// now lets take a look at the safe ring buffer option
const strictSafeRingBuffer = new RingBuffer(10, true, true);

// notice how the safe ring buffer now returns safe buffers?
const safeBuffer1 = strictSafeRingBuffer.write(Buffer.from('abcdef', 'hex'));
console.log('1', safeBuffer1.toString('hex'));
const safeBuffer2 = strictSafeRingBuffer.write(Buffer.from('123456', 'hex'));
console.log('1', safeBuffer1.toString('hex'), '2', safeBuffer2.toString('hex'));
const safeBuffer3 = strictSafeRingBuffer.write(Buffer.from('7890fe', 'hex'));
console.log('1', safeBuffer1.toString('hex'), '2', safeBuffer2.toString('hex'), '3', safeBuffer3.toString('hex'));
// ... what? you see no difference? well:

// let's try to access the buffers after writing another chunk to it, that exceeds the ring buffer size
const safeBuffer4 = strictSafeRingBuffer.write(Buffer.from('dcba09', 'hex'));
// if we only access the buffers that are safe to be accessed safeBuffer2, safeBuffer3 and safeBuffer4, it works as expected:
console.log('2', safeBuffer2.toString('hex'), '3', safeBuffer3.toString('hex'), '4', safeBuffer4.toString('hex'));
// however, as the previous call exceeded the ring buffer size, it wrapped around and wrote parts of the data into the memory area of safeBuffer1

// see what now happens if we try to access safeBuffer1:
try {
  console.log('1', safeBuffer1.toString('hex'));
} catch (err) {
  // we get an error, telling us that the buffer is no longer safe to access
  console.error(err.message);
}

// btw. also here there is a difference between strict & non-strict mode! in case we create a non-strict, but safe ring buffer:
const safeRingBuffer = new RingBuffer(10, false, true);

// we can still write to and access the data of the buffer:
const safeBuffer = safeRingBuffer.write(Buffer.from('0123456789abcdeffedc', 'hex'));
console.log('safe', safeBuffer.toString('hex'));

// however if we now write a chunk that stretches into the memory area of any previous buffer:
safeRingBuffer.write(Buffer.from('ba', 'hex'));

// ... and we try to access our ring-buffer, we will no longer get an error, but an empty buffer instead:
console.log('no longer safe', safeBuffer.toString('hex'));
