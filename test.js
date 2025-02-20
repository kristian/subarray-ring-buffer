import test from 'ava';
import { RingBuffer } from './index.js';

// Test initializing RingBuffer
test('Initialize ring buffer', t => {
    const ringBuffer = new RingBuffer(10);
    t.truthy(ringBuffer);
});

// Test writing within buffer limits
test('Write within buffer limits', t => {
    const ringBuffer = new RingBuffer(10);
    const buffer1 = ringBuffer.write(Buffer.from('abcdef', 'hex'));
    t.is(buffer1.toString('hex'), 'abcdef');
    
    const buffer2 = ringBuffer.write(Buffer.from('123456', 'hex'));
    t.is(buffer2.toString('hex'), '123456');
});

// Test writing beyond buffer limits (overflow behavior)
test('Write beyond buffer limits', t => {
    const ringBuffer = new RingBuffer(10);
    ringBuffer.write(Buffer.from('abcdef', 'hex'));
    ringBuffer.write(Buffer.from('123456', 'hex'));
    ringBuffer.write(Buffer.from('7890fe', 'hex'));
    const buffer4 = ringBuffer.write(Buffer.from('dcba09', 'hex'));
    
    t.is(buffer4.toString('hex'), 'dcba09');
});

// Test writing exceeding the full buffer size
test('Write chunk exceeding full buffer size', t => {
    const ringBuffer = new RingBuffer(10);
    const rest = ringBuffer.write(Buffer.from('abcdef12345678900987654321fedcba', 'hex'));
    t.is(rest.toString('hex'), '78900987654321fedcba');
});

// Test strict mode behavior
test('Strict ring buffer behavior', t => {
    const strictRingBuffer = new RingBuffer(10, true);
    const buffer = strictRingBuffer.write(Buffer.from('1234567890abcdeffedc', 'hex'));
    t.is(buffer.toString('hex'), '1234567890abcdeffedc');

    t.throws(() => {
        strictRingBuffer.write(Buffer.from('1234567890abcdeffedcba', 'hex'));
    }, { message: /chunk length exceeds size of ring buffer/ });
});

// Test safe ring buffer behavior
test('Safe ring buffer behavior', t => {
    const safeRingBuffer = new RingBuffer(10, false, true);
    const safeBuffer = safeRingBuffer.write(Buffer.from('0123456789abcdeffedc', 'hex'));
    t.is(safeBuffer.toString('hex'), '0123456789abcdeffedc');

    safeRingBuffer.write(Buffer.from('ba', 'hex'));
    t.is(safeBuffer.toString('hex'), '');
});

// Test strict + safe ring buffer
test('Strict + Safe ring buffer behavior', t => {
    const strictSafeRingBuffer = new RingBuffer(10, true, true);
    const safeBuffer1 = strictSafeRingBuffer.write(Buffer.from('0123456789abcdeffedc', 'hex'));
    t.is(safeBuffer1.toString('hex'), '0123456789abcdeffedc');

    strictSafeRingBuffer.write(Buffer.from('ba', 'hex'));
    t.throws(() => {
        safeBuffer1.toString('hex');
    }, { message: /buffer is no longer safe to access/ });
});
