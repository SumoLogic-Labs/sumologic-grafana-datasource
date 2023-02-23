import { interpolateVariable } from './interpolation.utils';

describe('interpolateVariable', () => {
  it.each([
    [['test'], '"test"'],
    [['test1', 'test2'], '("test1","test2")'],
    ['test', '"test"'],
    ['', '""'],
  ])('should handle interpolate input %s as %s', (input: string[] | string, output: string) => {
    expect(interpolateVariable(input)).toEqual(output);
  });
});
