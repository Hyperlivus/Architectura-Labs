import { describe, it, expect } from '@jest/globals';
import userService from '../../modules/user/service';

describe('user service CQRS surface', () => {
  it('exposes commands and queries objects', () => {
    expect(userService.commands).toBeDefined();
    expect(userService.queries).toBeDefined();
  });

  it('keeps backward-compatible aliases mapped', () => {
    expect(userService.getById).toBe(userService.queries.getById);
    expect(userService.getByTag).toBe(userService.queries.getByTag);
    expect(userService.getByEmail).toBe(userService.queries.getByEmail);
    expect(userService.getByTags).toBe(userService.queries.getByTags);
    expect(userService.getByTagOrEmail).toBe(userService.queries.getByEmailOrTag);
    expect(userService.create).toBe(userService.commands.create);
    expect(userService.update).toBe(userService.commands.update);
  });
});
