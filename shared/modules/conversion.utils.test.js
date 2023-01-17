import { EtherDenomination } from '../constants/common';
import {
  addCurrencies,
  decWEIToDecETH,
  divideCurrencies,
  getValueFromWeiHex,
  getWeiHexFromDecimalValue,
} from './conversion.utils';

describe('conversion utils', () => {
  describe('addCurrencies()', () => {
    it('add whole numbers', () => {
      const result = addCurrencies(3, 9, {
        aBase: 10,
        bBase: 10,
      });
      expect(result.toNumber()).toStrictEqual(12);
    });

    it('add decimals', () => {
      const result = addCurrencies(1.3, 1.9, {
        aBase: 10,
        bBase: 10,
      });
      expect(result.toNumber()).toStrictEqual(3.2);
    });

    it('add repeating decimals', () => {
      const result = addCurrencies(1 / 3, 1 / 9, {
        aBase: 10,
        bBase: 10,
      });
      expect(result.toNumber()).toStrictEqual(0.4444444444444444);
    });
  });

  describe('divideCurrencies()', () => {
    it('should correctly divide decimal values', () => {
      const result = divideCurrencies(9, 3, {
        dividendBase: 10,
        divisorBase: 10,
      });
      expect(result.toNumber()).toStrictEqual(3);
    });

    it('should correctly divide hexadecimal values', () => {
      const result = divideCurrencies(1000, 0xa, {
        dividendBase: 16,
        divisorBase: 16,
      });
      expect(result.toNumber()).toStrictEqual(0x100);
    });

    it('should correctly divide hexadecimal value from decimal value', () => {
      const result = divideCurrencies(0x3e8, 0xa, {
        dividendBase: 16,
        divisorBase: 16,
      });
      expect(result.toNumber()).toStrictEqual(0x100);
    });

    it('should throw error for wrong base value', () => {
      expect(() => {
        divideCurrencies(0x3e8, 0xa, {
          dividendBase: 10.5,
          divisorBase: 7,
        });
      }).toThrow('Must specify valid dividendBase and divisorBase');
    });
  });

  describe('decWEIToDecETH', () => {
    it('converts 10000000000000 WEI to ETH', () => {
      const ethDec = decWEIToDecETH('10000000000000');
      expect('0.00001').toStrictEqual(ethDec);
    });

    it('converts 9358749494527040 WEI to ETH', () => {
      const ethDec = decWEIToDecETH('9358749494527040');
      expect('0.009358749').toStrictEqual(ethDec);
    });
  });

  describe('getWeiHexFromDecimalValue', () => {
    it('should correctly convert 0 in ETH', () => {
      const weiValue = getWeiHexFromDecimalValue({
        value: '0',
        fromDenomination: EtherDenomination.ETH,
      });
      expect(weiValue).toStrictEqual('0');
    });

    it('should correctly convert 10 in ETH to 8ac7230489e80000 (10000000000000000000) wei', () => {
      const weiValue = getWeiHexFromDecimalValue({
        value: '10',
        fromDenomination: EtherDenomination.ETH,
      });
      expect(weiValue).toStrictEqual('8ac7230489e80000');
    });
  });

  describe('getValueFromWeiHex', () => {
    it('should get the transaction amount in ETH', () => {
      const ethTransactionAmount = getValueFromWeiHex({
        value: '0xde0b6b3a7640000',
        toCurrency: 'ETH',
        numberOfDecimals: 6,
      });

      expect(ethTransactionAmount).toStrictEqual('1');
    });

    it('should get the transaction amount in fiat', () => {
      const fiatTransactionAmount = getValueFromWeiHex({
        value: '0xde0b6b3a7640000',
        toCurrency: 'usd',
        conversionRate: 468.58,
        numberOfDecimals: 2,
      });

      expect(fiatTransactionAmount).toStrictEqual('468.58');
    });
  });
});
