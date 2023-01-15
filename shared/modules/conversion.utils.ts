/**
 * Currency Conversion Utility
 * This utility function can be used for converting currency related values within metamask.
 * The caller should be able to pass it a value, along with information about the value's
 * numeric base, denomination and currency, and the desired numeric base, denomination and
 * currency. It should return a single value.
 *
 * @param {(number | string | BN)} value - The value to convert.
 * @param {object} [options] - Options to specify details of the conversion
 * @param {string} [options.fromCurrency = EtherDenomination.ETH | 'USD'] - The currency of the passed value
 * @param {string} [options.toCurrency = EtherDenomination.ETH | 'USD'] - The desired currency of the result
 * @param {string} [options.fromNumericBase = 'hex' | 'dec' | 'BN'] - The numeric basic of the passed value.
 * @param {string} [options.toNumericBase = 'hex' | 'dec' | 'BN'] - The desired numeric basic of the result.
 * @param {string} [options.fromDenomination = EtherDenomination.WEI] - The denomination of the passed value
 * @param {string} [options.numberOfDecimals] - The desired number of decimals in the result
 * @param {string} [options.roundDown] - The desired number of decimals to round down to
 * @param {number} [options.conversionRate] - The rate to use to make the fromCurrency -> toCurrency conversion
 * @returns {(number | string | BN)}
 *
 * The utility passes value along with the options as a single object to the `converter` function.
 * `converter` conditional modifies the supplied `value` property, depending
 * on the accompanying options.
 */

import { isObject } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import { addHexPrefix, BN } from 'ethereumjs-util';
import { EtherDenomination } from '../constants/common';
import { Numeric } from './Numeric';

// Big Number Constants
const BIG_NUMBER_WEI_MULTIPLIER = new BigNumber('1000000000000000000');
const BIG_NUMBER_GWEI_MULTIPLIER = new BigNumber('1000000000');
const BIG_NUMBER_ETH_MULTIPLIER = new BigNumber('1');

// Setter Maps
const toNormalizedDenomination = {
  WEI: (bigNumber: BigNumber) => bigNumber.div(BIG_NUMBER_WEI_MULTIPLIER),
  GWEI: (bigNumber: BigNumber) => bigNumber.div(BIG_NUMBER_GWEI_MULTIPLIER),
  ETH: (bigNumber: BigNumber) => bigNumber.div(BIG_NUMBER_ETH_MULTIPLIER),
};

// Utility function for checking base types
const isValidBase = (base: number) => {
  return Number.isInteger(base) && base > 1;
};

/**
 * Defines the base type of numeric value
 */
export type NumericBase = 'hex' | 'dec' | undefined;

/**
 * Defines which type of denomination a value is in
 */

interface ConversionUtilParams {
  value: string | number | BN | BigNumber;
  fromNumericBase: NumericBase;
  fromDenomination?: EtherDenomination;
  fromCurrency?: string;
  toNumericBase?: NumericBase;
  toDenomination?: EtherDenomination;
  toCurrency?: string;
  numberOfDecimals?: number;
  conversionRate?: number | BigNumber;
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
  let base;
  if (fromNumericBase === 'hex') {
    base = 16 as const;
  } else if (fromNumericBase === 'dec') {
    base = 10 as const;
  }
  let toBase;
  if (toNumericBase === 'hex') {
    toBase = 16 as const;
  } else if (toNumericBase === 'dec') {
    toBase = 10 as const;
  }
  let numeric = new Numeric(value, base, fromDenomination);

  if (fromCurrency !== toCurrency) {
    if (conversionRate === null || conversionRate === undefined) {
      throw new Error(
        `Converting from ${fromCurrency} to ${toCurrency} requires a conversionRate, but one was not provided`,
      );
    }
    numeric = numeric.applyConversionRate(conversionRate, invertConversionRate);
  }

  if (toDenomination || typeof fromDenomination !== 'undefined') {
    numeric = numeric.toDenomination(toDenomination ?? EtherDenomination.ETH);
  }

  if (numberOfDecimals !== undefined && numberOfDecimals !== null) {
    numeric = numeric.round(numberOfDecimals, BigNumber.ROUND_HALF_DOWN);
  }

  if (roundDown) {
    numeric = numeric.round(roundDown, BigNumber.ROUND_DOWN);
  }

  if (toBase) {
    // console.log(
    //   'toBase',
    //   toBase,
    //   'value',
    //   numeric.toBase(toBase).toString(),
    //   'toDenom',
    //   toDenomination,
    //   'fromDenom',
    //   fromDenomination,
    // );
    return numeric.toBase(toBase).toString();
  }

  return numeric.value;
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

export const conversionGTE = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstValue = converter({ ...firstProps }) as BigNumber;
  const secondValue = converter({ ...secondProps }) as BigNumber;
  return firstValue.greaterThanOrEqualTo(secondValue);
};

export const conversionLTE = (
  { ...firstProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
  { ...secondProps }: Omit<ConversionUtilParams, 'toNumericBase'>,
) => {
  const firstValue = converter({ ...firstProps }) as BigNumber;
  const secondValue = converter({ ...secondProps }) as BigNumber;
  return firstValue.lessThanOrEqualTo(secondValue);
};

export function decGWEIToHexWEI(decGWEI: number) {
  return conversionUtil(decGWEI, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    fromDenomination: EtherDenomination.GWEI,
    toDenomination: EtherDenomination.WEI,
  });
}

export function subtractHexes(aHexWEI: string, bHexWEI: string) {
  return new Numeric(aHexWEI, 16)
    .minus(new Numeric(bHexWEI, 16))
    .round(6, BigNumber.ROUND_HALF_DOWN)
    .toString();
}

export function addHexes(aHexWEI: string, bHexWEI: string) {
  return new Numeric(aHexWEI, 16)
    .add(new Numeric(bHexWEI, 16))
    .round(6, BigNumber.ROUND_HALF_DOWN)
    .toString();
}

export function decWEIToDecETH(decWEI: string) {
  return new Numeric(decWEI, 10, EtherDenomination.WEI)
    .toDenomination(EtherDenomination.ETH)
    .toString();
}

export function hexWEIToDecETH(hexWEI: string) {
  return new Numeric(hexWEI, 16, EtherDenomination.WEI)
    .toDenomination(EtherDenomination.ETH)
    .toBase(10)
    .toString();
}

export function decEthToConvertedCurrency(
  ethTotal,
  convertedCurrency,
  conversionRate,
) {
  return conversionUtil(ethTotal, {
    fromNumericBase: 'dec',
    toNumericBase: 'dec',
    fromCurrency: EtherDenomination.ETH,
    toCurrency: convertedCurrency,
    numberOfDecimals: 2,
    conversionRate,
  });
}

export function getWeiHexFromDecimalValue({
  value,
  conversionRate = 1,
  fromDenomination,
  fromCurrency,
  invertConversionRate = false,
}: Pick<
  ConversionUtilParams,
  | 'value'
  | 'fromCurrency'
  | 'conversionRate'
  | 'fromDenomination'
  | 'invertConversionRate'
>) {
  let numeric = new Numeric(value, 10, fromDenomination);
  if (fromCurrency !== EtherDenomination.ETH) {
    numeric = numeric.applyConversionRate(conversionRate, invertConversionRate);
  }
  return numeric.toBase(16).toDenomination(EtherDenomination.WEI).toString();
}

/**
 * Converts a BN object to a hex string with a '0x' prefix
 *
 * @param inputBn - The BN to convert to a hex string
 * @returns A '0x' prefixed hex string
 */
export function bnToHex(inputBn: BN) {
  return addHexPrefix(inputBn.toString(16));
}

export function getEthConversionFromWeiHex({
  value,
  fromCurrency = EtherDenomination.ETH,
  conversionRate,
  numberOfDecimals = 6,
}: Pick<
  ConversionUtilParams,
  'value' | 'fromCurrency' | 'conversionRate' | 'numberOfDecimals'
>) {
  const denominations = [
    fromCurrency,
    EtherDenomination.GWEI,
    EtherDenomination.WEI,
  ];

  let nonZeroDenomination;

  for (let i = 0; i < denominations.length; i++) {
    const convertedValue = getValueFromWeiHex({
      value,
      conversionRate,
      fromCurrency,
      toCurrency: fromCurrency,
      numberOfDecimals,
      toDenomination: denominations[i],
    });

    if (convertedValue !== '0' || i === denominations.length - 1) {
      nonZeroDenomination = `${convertedValue} ${denominations[i]}`;
      break;
    }
  }

  return nonZeroDenomination;
}

export function getValueFromWeiHex({
  value,
  fromCurrency = EtherDenomination.ETH,
  toCurrency,
  conversionRate,
  numberOfDecimals,
  toDenomination = EtherDenomination.ETH,
}: Pick<
  ConversionUtilParams,
  | 'value'
  | 'fromCurrency'
  | 'toCurrency'
  | 'conversionRate'
  | 'numberOfDecimals'
  | 'toDenomination'
>) {
  let numeric = new Numeric(value, 16, EtherDenomination.WEI);
  if (fromCurrency !== toCurrency) {
    numeric = numeric.applyConversionRate(conversionRate);
  }
  return numeric
    .toBase(10)
    .toDenomination(toDenomination)
    .round(numberOfDecimals, BigNumber.ROUND_HALF_DOWN)
    .toString();
}

export function sumHexes(first: string, ...args: string[]) {
  const firstValue = new Numeric(first, 16);
  const total = args.reduce(
    (acc, hexAmount) => acc.add(new Numeric(hexAmount, 16)),
    firstValue,
  );

  return total.toPrefixedHexString();
}

export {
  conversionUtil,
  addCurrencies,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionLessThan,
  conversionMax,
  subtractCurrencies,
  toNormalizedDenomination,
  divideCurrencies,
};
