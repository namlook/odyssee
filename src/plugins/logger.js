
import _ from 'lodash';

export default function initLogger(plugin) {
  const { log } = plugin.settings.app;

  if (log) {
    const logMessages = _.isArray(log) ? log : [log];
    plugin.on('log', (message) => {
      if (message.tags.indexOf('odyssee') > -1) {
        if (_.intersection(message.tags, logMessages).length) {
          console.log(message.tags, message.data);
        }
      }
    });
  }
}
