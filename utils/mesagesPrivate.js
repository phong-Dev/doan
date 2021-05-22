const moment = require('moment');

function formatMessagePrivate(nameS, nameR, text) {
  return {
    nameS,
    nameR,
    text,
    time: moment().format('h:mm a')
  };
}

module.exports = formatMessagePrivate;
