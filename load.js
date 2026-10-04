global.window = global;
const vm = require('vm'), fs = require('fs');
module.exports = function (files) {
  files.forEach(f => vm.runInThisContext(fs.readFileSync(__dirname + '/' + f + '.js', 'utf8'), { filename: f }));
  return GM;
};
