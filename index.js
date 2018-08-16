const path = require('path')
module.exports = function (robot) {
  var scriptsPath = path.resolve(__dirname, 'scripts');
  return [
    robot.loadFile(scriptsPath, 'cdpAlertHubotListeners.js'),
    robot.loadFile(scriptsPath, 'cdpAlert.js')
  ];
};
