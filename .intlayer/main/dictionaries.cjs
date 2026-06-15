const _24a84e6f5ju = require('../dictionary/app.json');
const _233tas4j1ct = require('../dictionary/calibration.json');
const _btdbnhd6jq = require('../dictionary/videoControls.json');
const _1ge5pfv9xw3 = require('../dictionary/videoplayer.json');
const _gqyg42s5b4 = require('../dictionary/videoTimeline.json');

const dictionaries = {
  "app": _24a84e6f5ju,
  "calibration": _233tas4j1ct,
  "videoControls": _btdbnhd6jq,
  "videoplayer": _1ge5pfv9xw3,
  "videoTimeline": _gqyg42s5b4
};
const getDictionaries = () => dictionaries;

module.exports.getDictionaries = getDictionaries;
module.exports = dictionaries;
