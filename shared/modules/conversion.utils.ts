/**
 * Currency Conversion Utility
 * This utility function can be used for converting currency related values within metamask.
 * The caller should be able to pass it a value, along with information about the value's
 * numeric base, denomination and currency, and the desired numeric base, denomination and
 * currency. It should return a single value.
 *
 * @param {(number | string | BN)} value - The value to convert.
 * @param {object} [options] - Options to specify details of the conversion
 * @param {string} [options.fromCurrency = 'ETH' | 'USD'] - The currency of the passed value
 * @param {string} [options.toCurrency = 'ETH' | 'USD'] - The desired currency of the result
 * @param {string} [options.fromNumericBase = 'hex' | 'dec' | 'BN'] - The numeric basic of the passed value.
 * @param {string} [options.toNumericBase = 'hex' | 'dec' | 'BN'] - The desired numeric basic of the result.
 * @param {string} [options.fromDenomination = 'WEI'] - The denomination of the passed value
 * @param {string} [options.numberOfDecimals] - The desired number of decimals in the result
 * @param {string} [options.roundDown] - The desired number of decimals to round down to
 * @param {number} [options.conversionRate] - The rate to use to make the fromCurrency -> toCurrency conversion
 * @returns {(number | string | BN)}
 *
 * The utility passes value along with the options as a single object to the `converter` function.
 * `converter` conditional modifies the supplied `value` property, depending
 * on the accompanying options.
 */

import { isHexString, isObject } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import { BN } from 'ethereumjs-util';

import { stripHexPrefix } from './hexstring-utils';

// Big Number Constants
const BIG_NUMBER_WEI_MULTIPLIER = new BigNumber('1000000000000000000');
const BIG_NUMBER_GWEI_MULTIPLIER = new BigNumber('1000000000');
const BIG_NUMBER_ETH_MULTIPLIER = new BigNumber('1');

// Setter Maps
const toBigNumber = {
  hex: (n: string) => new BigNumber(stripHexPrefix(n), 16),
  dec: (n: number | string) => new BigNumber(String(n), 10),
  BN: (n: BN) => new BigNumber(n.toString(16), 16),
};
const toNormalizedDenomination = {
  WEI: (bigNumber: BigNumber) => bigNumber.div(BIG_NUMBER_WEI_MULTIPLIER),
  GWEI: (bigNumber: BigNumber) => bigNumber.div(BIG_NUMBER_GWEI_MULTIPLIER),
  ETH: (bigNumber: BigNumber) => bigNumber.div(BIG_NUMBER_ETH_MULTIPLIER),
};
const toSpecifiedDenomination = {
  WEI: (bigNumber: BigNumber) =>
    bigNumber.times(BIG_NUMBER_WEI_MULTIPLIER).round(),
  GWEI: (bigNumber: BigNumber) =>
    bigNumber.times(BIG_NUMBER_GWEI_MULTIPLIER).round(9),
  ETH: (bigNumber: BigNumber) =>
    bigNumber.times(BIG_NUMBER_ETH_MULTIPLIER).round(9),
};
const baseChange = {
  hex: (n: BigNumber) => n.toString(16),
  dec: (n: BigNumber) => new BigNumber(n).toString(10),
  BN: (n: BigNumber) => new BN(n.toString(16)),
};

// Utility function for checking base types
const isValidBase = (base: number) => {
  return Number.isInteger(base) && base > 1;
};

/**
 * Defines the base type of numeric value
 */
export type NumericBase = 'hex' | 'dec' | 'BN' | undefined;

/**
 * Defines which type of denomination a value is in
 */
export type EthDenomination = 'WEI' | 'GWEI' | 'ETH';

interface ConversionUtilParams {
  value: string | number | BN | BigNumber;
  fromNumericBase: NumericBase;
  fromDenomination?: EthDenomination;
  fromCurrency?: string;
  toNumericBase?: NumericBase;
  toDenomination?: EthDenomination;
  toCurrency?: string;
  numberOfDecimals?: number;
  conversionRate?: number;
  invertConversionRate?: boolean;
  roundDown?: number;
}

/**
 * Utility method to convert a value between denominations, formats and currencies.
 *
 * @param input
 * @param input.value
 * @param input.fromNumericBase
 * @param [input.fromDenomination]
 * @param [input.fromCurrency]
 * @param input.toNumericBase
 * @param [input.toDenomination]
 * @param [input.toCurrency]
 * @param [input.numberOfDecimals]
 * @param [input.conversionRate]
 * @param [input.invertConversionRate]
 * @param [input.roundDown]
 */

function converter({
  value,
  fromNumericBase,
  fromDenomination,
  fromCurrency,
  toNumericBase,
  toDenomination,
  toCurrency,
  numberOfDecimals,
  conversionRate,
  invertConversionRate,
  roundDown,
}: ConversionUtilParams) {
  // let convertedValue = fromNumericBase
  //   ? toBigNumber[fromNumericBase](value)
  //   : value;

  let convertedValue: BigNumber;

  if (fromNumericBase === 'hex' && isHexString(value)) {
    convertedValue = toBigNumber.hex(value);
  } else if (
    fromNumericBase === 'dec' &&
    (typeof value === 'number' || typeof value === 'string')
  ) {
    convertedValue = toBigNumber.dec(value);
  } else if (fromNumericBase === 'BN' && value instanceof BN) {
    convertedValue = toBigNumber.BN(value);
  } else if (
    typeof fromNumericBase === 'undefined' &&
    value instanceof BigNumber
  ) {
    convertedValue = value;
  } else if (typeof fromNumericBase === 'undefined') {
    throw new Error(
      'fromNumericBase is not specified and value is not an instanceOf BigNumber',
    );
  } else {
    throw new Error(
      `fromNumericBase was provided as ${fromNumericBase} and typeof value is ${typeof value}`,
    );
  }

  if (fromDenomination) {
    convertedValue = toNormalizedDenomination[fromDenomination](convertedValue);
  }

  if (fromCurrency !== toCurrency) {
    if (conversionRate === null || conversionRate === undefined) {
      throw new Error(
        `Converting from ${fromCurrency} to ${toCurrency} requires a conversionRate, but one was not provided`,
      );
    }
    let rate = toBigNumber.dec(conversionRate);
    if (invertConversionRate) {
      rate = new BigNumber(1.0).div(conversionRate);
    }
    convertedValue = convertedValue.times(rate);
  }

  if (toDenomination) {
    convertedValue = toSpecifiedDenomination[toDenomination](convertedValue);
  }

  if (numberOfDecimals !== undefined && numberOfDecimals !== null) {
    convertedValue = convertedValue.round(
      numberOfDecimals,
      BigNumber.ROUND_HALF_DOWN,
    );
  }

  if (roundDown) {
    convertedValue = convertedValue.round(roundDown, BigNumber.ROUND_DOWN);
  }

  if (toNumericBase === 'hex') {
    return baseChange.hex(convertedValue);
  } else if (toNumericBase === 'dec') {
    return baseChange.dec(convertedValue);
  } else if (toNumericBase === 'BN') {
    return baseChange.BN(convertedValue);
  }

  return convertedValue;
}

const conversionUtil = (
  value: string | number | BN | BigNumber,
  {
    fromCurrency = undefined,
    toCurrency = fromCurrency,
    fromNumericBase,
    toNumericBase,
    fromDenomination,
    toDenomination,
    numberOfDecimals,
    conversionRate,
    invertConversionRate,
  }: Omit<ConversionUtilParams, 'value'>,
) => {
  if (fromCurrency !== toCurrency && !conversionRate) {
    return 0;
  }
  return converter({
    fromCurrency,
    toCurrency,
    fromNumericBase,
    toNumericBase,
    fromDenomination,
    toDenomination,
    numberOfDecimals,
    conversionRate,
    invertConversionRate,
    value: value || '0',
  });
};

type BigNumberConversionInputTypes = number | BigNumber | string;

const getBigNumber = (value: BigNumberConversionInputTypes, base: number) => {
  if (!isValidBase(base)) {
    throw new Error('Must specify valid base');
  }

  // We don't include 'number' here, because BigNumber will throw if passed
  // a number primitive it considers unsafe.
  if (typeof value === 'string' || value instanceof BigNumber) {
    return new BigNumber(value, base);
  }

  return new BigNumber(String(value), base);
};

const addCurrencies = (
  a: BigNumberConversionInputTypes,
  b: BigNumberConversionInputTypes,
  options: Omit<ConversionUtilParams, 'value'> & {
    aBase: number;
    bBase: number;
  },
) => {
  if (
    isObject(options) === false ||
    !isValidBase(options?.aBase) ||
    !isValidBase(options?.bBase)
  ) {
    throw new Error('Must specify valid aBase and bBase');
  }
  const { aBase, bBase, ...conversionOptions } = options;

  const value = getBigNumber(a, aBase).add(getBigNumber(b, bBase));

  return converter({
    value,
    ...conversionOptions,
  });
};

const subtractCurrencies = (
  a: BigNumberConversionInputTypes,
  b: BigNumberConversionInputTypes,
  options: Omit<ConversionUtilParams, 'value'> & {
    aBase: number;
    bBase: number;
  },
) => {
  if (
    isObject(options) === false ||
    !isValidBase(options?.aBase) ||
    !isValidBase(options?.bBase)
  ) {
    throw new Error('Must specify valid aBase and bBase');
  }
  const { aBase, bBase, ...conversionOptions } = options;

  const value = getBigNumber(a, aBase).minus(getBigNumber(b, bBase));

  return converter({
    value,
    ...conversionOptions,
  });
};

const multiplyCurrencies = (
  a: BigNumberConversionInputTypes,
  b: BigNumberConversionInputTypes,
  options: Omit<ConversionUtilParams, 'value'> & {
    multiplicandBase: number;
    multiplierBase: number;
  },
) => {
  if (
    isObject(options) === false ||
    !isValidBase(options?.multiplicandBase) ||
    !isValidBase(options?.multiplierBase)
  ) {
    throw new Error('Must specify valid multiplicandBase and multiplierBase');
  }
  const { multiplicandBase, multiplierBase, ...conversionOptions } = options;

  const value = getBigNumber(a, multiplicandBase).times(
    getBigNumber(b, multiplierBase),
  );

  return converter({
    value,
    ...conversionOptions,
  });
};

const divideCurrencies = (
  a: BigNumberConversionInputTypes,
  b: BigNumberConversionInputTypes,
  options: Omit<ConversionUtilParams, 'value'> & {
    dividendBase: number;
    divisorBase: number;
  },
) => {
  if (
    isObject(options) === false ||
    !isValidBase(options?.dividendBase) ||
    !isValidBase(options?.divisorBase)
  ) {
    throw new Error('Must specify valid dividendBase and divisorBase');
  }
  const { dividendBase, divisorBase, ...conversionOptions } = options;

  const value = getBigNumber(a, dividendBase).div(getBigNumber(b, divisorBase));

  return converter({
    value,
    ...conversionOptions,
  });
};

const conversionGreaterThan = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstValue = converter({ ...firstProps }) as BigNumber;
  const secondValue = converter({ ...secondProps }) as BigNumber;

  return firstValue.gt(secondValue);
};

const conversionLessThan = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstValue = converter({ ...firstProps }) as BigNumber;
  const secondValue = converter({ ...secondProps }) as BigNumber;

  return firstValue.lt(secondValue);
};

const conversionMax = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstIsGreater = conversionGreaterThan(
    { ...firstProps },
    { ...secondProps },
  );

  return firstIsGreater ? firstProps.value : secondProps.value;
};

const conversionGTE = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstValue = converter({ ...firstProps }) as BigNumber;
  const secondValue = converter({ ...secondProps }) as BigNumber;
  return firstValue.greaterThanOrEqualTo(secondValue);
};

const conversionLTE = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstValue = converter({ ...firstProps }) as BigNumber;
  const secondValue = converter({ ...secondProps }) as BigNumber;
  return firstValue.lessThanOrEqualTo(secondValue);
};

const toNegative = (
  n: BigNumberConversionInputTypes,
  options: Omit<ConversionUtilParams, 'value'> & {
    multiplicandBase: number;
    multiplierBase: number;
  },
) => {
  return multiplyCurrencies(n, -1, options);
};

function decGWEIToHexWEI(decGWEI: number) {
  return conversionUtil(decGWEI, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    fromDenomination: 'GWEI',
    toDenomination: 'WEI',
  });
}

export {
  conversionUtil,
  addCurrencies,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionLessThan,
  conversionGTE,
  conversionLTE,
  conversionMax,
  toNegative,
  subtractCurrencies,
  decGWEIToHexWEI,
  toBigNumber,
  toNormalizedDenomination,
  divideCurrencies,
};
