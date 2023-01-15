import { BigNumber } from 'bignumber.js';
import BN from 'bn.js';
import { isHexString } from '@metamask/utils';
import { addHexPrefix } from 'ethereumjs-util';
import { EtherDenomination } from '../constants/common';
import { stripHexPrefix } from './hexstring-utils';

type NumericValue = string | number | BN | BigNumber;

function isHexStringOrNegatedHexString(value: string): value is string {
  return isHexString(value.replace('-', '')) || isHexString(value);
}

function isDecimalHex(value: string): boolean {
  const parts = value.split('.');
  if (parts.length === 1) {
    return false;
  }
  return parts.every((part) => isHexStringOrNegatedHexString(part));
}

function hexadecimalToBigNumber(value: string | number): BigNumber {
  const stringified = typeof value === 'number' ? `${value}` : value;
  const isNegative = stringified[0] === '-';
  const valueWithoutNegation = stringified.replace('-', '');

  const valueAsBigNumber = new BigNumber(
    stripHexPrefix(valueWithoutNegation),
    16,
  );
  return isNegative ? valueAsBigNumber.negated() : valueAsBigNumber;
}

function decimalToBigNumber(value: string | number) {
  return new BigNumber(String(value), 10);
}

/**
 * This method is used to safely convert a string type value to a BigNumber.
 * The only valid strings for this method are those that are either hexadecimal
 * numeric values OR numeric strings that can be converted to BigNumbers. It is
 * impossible to tell the difference between a hex value of 100000 vs a decimal
 * value of 100000 so a second parameter indicating whether the value is a hex
 * or decimal is provided ('hex' | 'dec'). A third option is a carryover from
 * our current system whereby some values that were hexadecimal strings were
 * being called with 'BN' as the provided numericBase. This is an error that
 * will be corrected overtime.
 * TODO: Deprecate 'BN' as a valid option for this method
 *
 * @param value - A hexadecimal or decimal string
 * @param numericBase - Either 'hex' for a hexadeciaml or 'dec' for a decimal
 * @returns A BigNumber representation of the value
 */
function stringToBigNumber(value: string, numericBase: 10 | 16) {
  if (typeof value !== 'string') {
    throw new Error(
      `Value of type ${typeof value} passed to stringToBigNumber`,
    );
  }
  if (
    numericBase === 16 &&
    (isHexStringOrNegatedHexString(value) || isDecimalHex(value))
  ) {
    return hexadecimalToBigNumber(value);
  } else if (numericBase === 10 && isFinite(parseInt(value, 10))) {
    return decimalToBigNumber(value);
  }
  throw new Error(
    `String provided to stringToBigNumber is not a hexadecimal or decimal string: ${value}, ${numericBase}`,
  );
}

/**
 * This method is
 *
 * @param value
 * @param numericBase
 * @returns
 */
function numberToBigNumber(value: number, numericBase: 10 | 16) {
  if (typeof value !== 'number') {
    throw new Error(
      `Value of type ${typeof value} passed to numberToBigNumber`,
    );
  }
  if (numericBase === 16 && isHexString(`${value}`)) {
    return new BigNumber(`${value}`, 16);
  }
  return new BigNumber(value, 10);
}

function bnToBigNumber(value: BN) {
  if (value instanceof BN === false) {
    throw new Error(
      `value passed to bnToBigNumber is not a BN. Received type ${typeof value}`,
    );
  }
  return new BigNumber(value.toString(16), 16);
}

function valueToBigNumber(value: string | number | BN, numericBase: 10 | 16) {
  if (typeof value === 'string') {
    return stringToBigNumber(value, numericBase);
  } else if (typeof value === 'number') {
    return numberToBigNumber(value, numericBase);
  }
  console.log(typeof value, value);
  return bnToBigNumber(value);
}

// Big Number Constants
const BIG_NUMBER_WEI_MULTIPLIER = new BigNumber('1000000000000000000');
const BIG_NUMBER_GWEI_MULTIPLIER = new BigNumber('1000000000');
const BIG_NUMBER_ETH_MULTIPLIER = new BigNumber('1');

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

/**
 * Numeric is a class whose methods will always return a new, not mutated,
 * value. This allows for chaining of non-terminating methods. Previously we
 * had near a hundred helper methods that composed one-another, making tracking
 * through the chain near impossible. This API is designed such that no helper
 * methods should be needed. Take the case of hexWEIToDecGWEI, a helper method
 * for taking a hex string representing a value in WEI and converting that to a
 * decimal of GWEI. Prior to this class the method would call into our root
 * level 'conversionUtil' which was the proverbial kitchen sink doing
 * everything from denomination conversion, currency conversion (with provided
 * conversionRate prop) and more. The same opeartion can now be expressed as:
 * new Numeric(hexString, 16, EtherDenomination.WEI)
 * .toDenomination(EtherDenomination.GWEI)
 * .toBase(10)
 * .toString();
 * This has the benefit of being fairly transparent as you can read each step
 * in the chain and have a good sense of what is being done. It also is highly
 * composable so that we shouldn't need tons of helper methods for shortcuts.
 */
export class Numeric {
  value: BigNumber;

  base?: 10 | 16;

  denomination?: EtherDenomination;

  constructor(
    value: NumericValue,
    base?: 10 | 16,
    denomination?: EtherDenomination,
  ) {
    this.base = base;
    this.denomination = denomination;
    if (value instanceof BigNumber) {
      this.value = value;
    } else if (typeof value === 'undefined') {
      this.value = new BigNumber('0', 10);
      this.base = 10;
    } else if (base) {
      this.value = valueToBigNumber(value, base);
    } else {
      throw new Error(
        `You must specify the base of the provided number if the value is not already a BigNumber`,
      );
    }
  }

  static from(
    value: NumericValue,
    base?: 10 | 16,
    denomination?: EtherDenomination,
  ) {
    return new Numeric(value, base, denomination);
  }

  toBase(base: 10 | 16) {
    if (this.base !== base) {
      return new Numeric(this.value, base, this.denomination);
    }
    return this;
  }

  setDenomination(denomination: EtherDenomination) {
    this.denomination = denomination;
    return this;
  }

  getValueInETH() {
    if (
      this.denomination === EtherDenomination.ETH ||
      typeof this.denomination === 'undefined'
    ) {
      return this.value;
    }
    return toNormalizedDenomination[this.denomination](this.value);
  }

  toDenomination(denomination: EtherDenomination) {
    if (typeof this.denomination === undefined) {
      throw new Error(
        'You may not convert a Numeric to a denomination if it was constructed without a denomination supplied. To fix this, first call the `setDenomination` method or supply a denomination in the constructor',
      );
    }
    if (this.denomination !== denomination) {
      const result = new Numeric(
        toSpecifiedDenomination[denomination](this.getValueInETH()),
        this.base,
        denomination,
      );
      return result;
    }
    return this;
  }

  round(
    numberOfDecimals?: number,
    roundingMode: number = BigNumber.ROUND_HALF_DOWN,
  ) {
    if (numberOfDecimals) {
      return new Numeric(
        this.value.round(numberOfDecimals, roundingMode),
        this.base,
        this.denomination,
      );
    }
    return this;
  }

  add(numeric: Numeric) {
    return new Numeric(this.value.add(numeric.value), this.base);
  }

  minus(numeric: Numeric) {
    return new Numeric(this.value.minus(numeric.value), this.base);
  }

  times(multiplier: Numeric) {
    return new Numeric(
      this.value.times(multiplier.value),
      this.base,
      this.denomination,
    );
  }

  applyConversionRate(rate?: number | BigNumber, invert?: boolean) {
    let conversionRate = new Numeric(rate ?? 1, 10);
    if (invert) {
      conversionRate = new Numeric(new BigNumber(1.0)).divide(conversionRate);
    }
    return this.times(conversionRate);
  }

  divide(divisor: Numeric) {
    return new Numeric(
      this.value.div(divisor.value),
      this.base,
      this.denomination,
    );
  }

  toPrefixedHexString() {
    return addHexPrefix(this.value.toString(16));
  }

  toString() {
    return this.value.toString(this.base);
  }

  toFixed(decimals: number) {
    return this.value.toFixed(decimals);
  }

  toNumber() {
    return this.value.toNumber();
  }
}
