
module.exports = function (robot) {
  var scriptsPath = path.resolve(__dirname, 'scripts');
  return [
    robot.loadFile(scriptsPath, 'cdpAlertHubotListeners.js')
  ];
};
