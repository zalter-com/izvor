// noinspection JSCheckFunctionSignatures
/**
 * Generates a buffer of given length random 8 bit numbers.
 * @param {number} length
 * @returns {Buffer}
 */
export const randomBuffer = (length = 24) =>
	Buffer.from(Array.from(new Array(length)).map(() => Math.floor(Math.random() * 1e10) % 256));

const alphaNumeric = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
/**
 * Generates a string of random capital letters.
 * @param {number} length
 * @returns {string}
 */
export const randomString = (length = 24) =>
	Array.from(new Array(length)).map(() => alphaNumeric[Math.floor(Math.random() * 1e10) % alphaNumeric.length]).join("");

export const randomBetween = (min, max) => Math.floor(Math.random() * 1e12 % (max - min + 1)) + min;
