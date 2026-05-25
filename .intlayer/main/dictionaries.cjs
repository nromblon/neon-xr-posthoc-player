const _9xqy9922zn = require('../dictionary/app.json');
const _1n3yln3pejh = require('../dictionary/videoControls.json');
const _2aw5bqhxdxj = require('../dictionary/videoplayer.json');
const _1sxdu1mpek7 = require('../dictionary/videoTimeline.json');

const dictionaries = {
  "app": _9xqy9922zn,
  "videoControls": _1n3yln3pejh,
  "videoplayer": _2aw5bqhxdxj,
  "videoTimeline": _1sxdu1mpek7
};
const getDictionaries = () => dictionaries;

module.exports.getDictionaries = getDictionaries;
module.exports = dictionaries;
