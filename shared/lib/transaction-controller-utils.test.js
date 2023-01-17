import { calcGasTotal } from './transactions-controller-utils';

describe('calcGasTotal()', () => {
  it('should call multiplyCurrencies with the correct params and return the multiplyCurrencies return', () => {
    const result = calcGasTotal(12, 15);
    expect(result).toStrictEqual('17a');
  });
});
