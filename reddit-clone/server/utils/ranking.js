/**
 * Reddit-style Hot Ranking Algorithm
 *
 * Based on Reddit's original Wilson score / logarithmic decay formula.
 * Score = log10(max(|ups - downs|, 1)) + sign(ups - downs) * (seconds since epoch) / 45000
 *
 * The 45000 divisor means a post ages by ~1 log unit every ~12.5 hours.
 * This keeps hot posts competitive with fresh content.
 */

const EPOCH = 1134028003; // Reddit's founding timestamp (Dec 8, 2005)

/**
 * @param {number} ups - Number of upvotes
 * @param {number} downs - Number of downvotes
 * @param {Date} date - Post creation date
 * @returns {number} Hot score
 */
const hotScore = (ups, downs, date) => {
  const score = ups - downs;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = (date.getTime() / 1000) - EPOCH;
  return parseFloat((sign * order + seconds / 45000).toFixed(7));
};

/**
 * Wilson Score Lower Bound — used for "best" comment ranking.
 * Gives a confidence interval around a proportion.
 * @param {number} ups
 * @param {number} downs
 * @returns {number} Wilson score
 */
const wilsonScore = (ups, downs) => {
  const n = ups + downs;
  if (n === 0) return 0;

  const z = 1.96; // 95% confidence
  const phat = ups / n;
  return (
    (phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
};

/**
 * Controversy score — posts with many votes on both sides rank higher.
 * @param {number} ups
 * @param {number} downs
 * @returns {number}
 */
const controversyScore = (ups, downs) => {
  if (ups <= 0 || downs <= 0) return 0;
  const magnitude = ups + downs;
  const balance = ups > downs ? downs / ups : ups / downs;
  return magnitude ** balance;
};

module.exports = { hotScore, wilsonScore, controversyScore };
