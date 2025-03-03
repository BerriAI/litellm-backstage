import { litellmPlugin } from './plugin';

describe('litellm', () => {
  it('should export plugin', () => {
    expect(litellmPlugin).toBeDefined();
  });
});
