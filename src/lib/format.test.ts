import { describe, it, expect } from 'vitest';
import { formatTime } from './format';

describe('formatTime', () => {
  it('should return "0:00" for 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('should format 1 second as "0:01"', () => {
    expect(formatTime(1)).toBe('0:01');
  });

  it('should format 59 seconds as "0:59"', () => {
    expect(formatTime(59)).toBe('0:59');
  });

  it('should format 60 seconds as "1:00"', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('should format 61 seconds as "1:01"', () => {
    expect(formatTime(61)).toBe('1:01');
  });

  it('should format 125 seconds as "2:05" (example from JSDoc)', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('should format 600 seconds as "10:00"', () => {
    expect(formatTime(600)).toBe('10:00');
  });

  it('should format 3661 seconds as "61:01" (over an hour)', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  // Negative values are not part of the function's contract (no input validation needed)
});
