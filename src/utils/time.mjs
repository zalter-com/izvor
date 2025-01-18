/**
 * Adds days to a given date
 * @param {Date} date
 * @param {number} daysCount
 * @return {Date}
 */
export const addDays = (date, daysCount) => {
	return new Date(date.getTime() + daysCount * 8.64e7);
};
