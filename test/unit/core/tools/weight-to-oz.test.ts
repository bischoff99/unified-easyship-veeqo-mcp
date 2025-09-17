import { describe, it, expect } from 'vitest';
import { weightToOz } from '@/core/tools/weight-to-oz';

describe('weightToOz', () => {
  it('should convert pounds and ounces to ounces correctly', async () => {
    const result = await weightToOz({ pounds: 1, ounces: 8 });
    expect(result.weight_oz).toBe(24);
    expect(result.weight_lb).toBe(1.5);
    expect(result.formatted).toBe('1lb 8oz');
  });

  it('should handle floating point inputs', async () => {
    const result = await weightToOz({ pounds: 1.5 });
    expect(result.weight_oz).toBe(24);
    expect(result.weight_lb).toBe(1.5);
    expect(result.formatted).toBe('1lb 8oz');
  });

  it('should throw an error for zero weight', async () => {
    await expect(weightToOz({ pounds: 0, ounces: 0 })).rejects.toThrow(
      'Weight must be greater than 0'
    );
  });

  it('should handle floating point inaccuracies by rounding', async () => {
    const result = await weightToOz({ ounces: 15.999999999999998 });
    expect(result.formatted).toBe('1lb 0oz');
  });

  it('should format ounces only correctly', async () => {
    const result = await weightToOz({ ounces: 12 });
    expect(result.formatted).toBe('0lb 12oz');
  });
});
