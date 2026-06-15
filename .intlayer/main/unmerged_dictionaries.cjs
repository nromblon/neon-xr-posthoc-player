const _2c1o2ssirqm = require('../unmerged_dictionary/app.json');
const _19u2gzj0kx6 = require('../unmerged_dictionary/calibration.json');
const _19o4svpmmve = require('../unmerged_dictionary/videoControls.json');
const _t0buyc0gfr = require('../unmerged_dictionary/videoplayer.json');
const _qbhx9kn2bz = require('../unmerged_dictionary/videoTimeline.json');

const dictionaries = {
  "app": _2c1o2ssirqm,
  "calibration": _19u2gzj0kx6,
  "videoControls": _19o4svpmmve,
  "videoplayer": _t0buyc0gfr,
  "videoTimeline": _qbhx9kn2bz
};
const getUnmergedDictionaries = () => dictionaries;

module.exports.getUnmergedDictionaries = getUnmergedDictionaries;
module.exports = dictionaries;
