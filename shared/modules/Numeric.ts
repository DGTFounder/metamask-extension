import { BigNumber } from 'bignumber.js';
import BN from 'bn.js';
import { isHexString } from '@metamask/utils';
import { addHexPrefix } from 'ethereumjs-util';
import { EtherDenomination } from '../constants/common';
import { stripHexPrefix } from './hexstring-utils';

type NumericValue = string | number | BN | BigNumber;

/**
 * All variations of isHexString from our own utilities and etherumjs-utils
 * return false for a '-' prefixed hex string. This utility method strips the
 * possible '-' from the string before testing its validity so that negative
 * hex values can be properly handled.
 *
 * @param value - The string to check
 * @returns true if the value is a hex string (negative or otherwise)
 */
function isHexStringOrNegatedHexString(value: string): value is string {
  return isHexString(value.replace('-', '')) || isHexString(value);
}

/**
 * BigNumber supports hex strings with '.' (aka decimals) in the string.
 * No version of isHexString returs true if the string contains a decimal so
 * this method is used to check if both parts of the string split by the
 * decimal are hex strings. If so we can feed this value into BigNumber to get
 * a valid Numeric.
 *
 * @param value - The string to check
 * @returns true if the string is a hexadecimal split by '.'
 */
function isDecimalHex(value: string): boolean {
  const parts = value.split('.');
  if (parts.length === 1) {
    return false;
  }
  return parts.every((part) => isHexStringOrNegatedHexString(part));
}

/**
 * Converts a hexadecimal in string or number format to a BigNumber.
 *
 * @param value - hexadecimal value in string or number format.
 * @returns A BigNumber representation of the value
 */
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

/**
 * Converts a decimal in string or number format to a BigNumber.
 *
 * @param value - decimal value in string or number format.
 * @returns A BigNumber representation of the value
 */
function decimalToBigNumber(value: string | number) {
  return new BigNumber(String(value), 10);
}

/**
 * This method is used to safely convert a string type value to a BigNumber.
 * The only valid strings for this method are those that are either hexadecimal
 * numeric values OR numeric strings that can be converted to BigNumbers. It is
 * impossible to tell the difference between a hex value of 100000 vs a decimal
 * value of 100000 so a second parameter indicating the numeric base of the
 * string value must be provided.
 *
 * @param value - A hexadecimal or decimal string
 * @param numericBase - Either 16 for a hexadeciaml or 10 for a decimal
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
 * This method will convert a hexadecimal or deciaml number into a BigNumber.
 * The second parameter must be supplied and determines whether to treat the
 * value as a hexadecimal or decimal value.
 *
 * @param value - hexadecimal or decimal number[]
 * @param numericBase - 10 for decimal, 16 for hexadecimal
 * @returns BigNumber representation of the value
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

/**
 * Method to convert a BN to a BigNumber
 *
 * @param value - A BN representation of a value
 * @returns A BigNumber representation of the BN's underlying value
 */
function bnToBigNumber(value: BN) {
  if (value instanceof BN === false) {
    throw new Error(
      `value passed to bnToBigNumber is not a BN. Received type ${typeof value}`,
    );
  }
  return new BigNumber(value.toString(16), 16);
}

/**
 * Converts a value of the supported types (string, number, BN) to a BigNumber.
 *
 * @param value - The value to convert to a BigNumber
 * @param numericBase - The numeric base of the underlying value
 * @returns A BigNumber representation of the value
 */
function valueToBigNumber(value: string | number | BN, numericBase: 10 | 16) {
  if (typeof value === 'string') {
    return stringToBigNumber(value, numericBase);
  } else if (typeof value === 'number') {
    return numberToBigNumber(value, numericBase);
  }
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
  /**
   * The underlying value of the Numeric, always in BigNumber form
   */
  value: BigNumber;

  /**
   * The numeric base for this Numeric, either 10 for decimal or 16 for Hex
   */
  base?: 10 | 16;

  /**
   * The current denomination, if any. The only supported denominations are
   * ETH, GWEI, WEI.
   */
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
      // There are parts of the codebase that call this method without a value.
      // Over time of converting to TypeScript we will eradicate those, but the
      // helper methods that those instances employ would default the value to
      // 0. This block keeps that intact.
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

  /**
   * I was unsure if MetaMask prefers the `new Numeric` or `Numeric.from` syntax.
   * Will keep this in for now and remove during review if we prefer the new
   * keyword.
   *
   * @param value - The value of the Numeric
   * @param base - Either undefined, 10 for decimal or 16 for hexadecimal
   * @param denomination - The Ether denomination to set, if any
   * @deprecated
   */
  static from(
    value: NumericValue,
    base?: 10 | 16,
    denomination?: EtherDenomination,
  ) {
    return new Numeric(value, base, denomination);
  }

  /**
   * Returns a new Numeric with the base value changed to the provided base,
   * or the original Numeric if the base provided is the same as the current
   * base. No computation or conversion happens here but rather the result of
   * toString will be changed depending on the value of this.base when that
   * method is invoked.
   *
   * @param base - The numeric base to change the Numeric to, either 10 or 16
   * @returns A new Numeric with the base updated
   */
  toBase(base: 10 | 16) {
    if (this.base !== base) {
      return new Numeric(this.value, base, this.denomination);
    }
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

  /**
   * Applies a conversion rate to the Numeric, defaulting to 1 to handle
   * possibly undefined rates.
   *
   * @param rate - The multiplier to apply, defaults to 1 to handle possibly
   * undefined values.
   * @param invert - if true, inverts the rate
   * @returns New Numeric value with conversion rate applied.
   */
  applyConversionRate(rate?: number | BigNumber, invert?: boolean) {
    let conversionRate = new Numeric(rate ?? 1, 10);
    if (invert) {
      conversionRate = new Numeric(new BigNumber(1.0)).divide(conversionRate);
    }
    return this.times(conversionRate);
  }

  /**
   * Divides the Numeric by another supplied Numeric, carrying over the base
   * and denomination from the current Numeric.
   *
   * @param divisor - The Numeric to divide this Numeric by
   * @returns A new Numeric that contains the result of the division
   */
  divide(divisor: Numeric) {
    return new Numeric(
      this.value.div(divisor.value),
      this.base,
      this.denomination,
    );
  }

  /**
   * Get a base 16 hexadecimal string representation of the Numeric that is
   * 0x prefixed. This operation bypasses the currently set base of the
   * Numeric.
   *
   * @returns 0x prefixed hexstring.
   */
  toPrefixedHexString() {
    return addHexPrefix(this.value.toString(16));
  }

  /**
   * Gets the string representation of the Numeric, using the current value of
   * this.base to determine if it should be a decimal or hexadecimal string.
   *
   * @returns the string representation of the Numeric
   */
  toString() {
    return this.value.toString(this.base);
  }

  /**
   * Returns a fixed-point decimal string representation of the Numeric
   *
   * @param decimals - the amount of decimal precision to use when rounding
   * @returns A fixed point decimal string represenation of the Numeric
   */
  toFixed(decimals: number) {
    return this.value.toFixed(decimals);
  }

  /**
   *
   * @returns
   */
  toNumber() {
    return this.value.toNumber();
  }
}
