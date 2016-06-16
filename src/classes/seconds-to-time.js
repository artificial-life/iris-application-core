'use strict'

module.exports = function secondsToTime(time) {
  let hours = _.floor(time / (60 * 60));
  let mins = _.floor((time % 3600) / 60);
  mins = mins.toString().length == 1 ? '0' + mins : mins;

  return `${hours}:${mins}`;
};