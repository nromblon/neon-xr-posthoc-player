const _tr6q8o3et2 = require('../unmerged_dictionary/app.json');
const _1bxvceqlebw = require('../unmerged_dictionary/calibration.json');
const _p13g9v6stl = require('../unmerged_dictionary/videoControls.json');
const _1muo4gi8b4 = require('../unmerged_dictionary/videoplayer.json');
const _1m22jtijd25 = require('../unmerged_dictionary/videoTimeline.json');

const dictionaries = {
  "app": _tr6q8o3et2,
  "calibration": _1bxvceqlebw,
  "videoControls": _p13g9v6stl,
  "videoplayer": _1muo4gi8b4,
  "videoTimeline": _1m22jtijd25
};
const getUnmergedDictionaries = () => dictionaries;

module.exports.getUnmergedDictionaries = getUnmergedDictionaries;
module.exports = dictionaries;
