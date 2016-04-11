
import kue from 'kue';
import _ from 'lodash';


const registerTasks = function registerTasks(plugin, options) {
    const { redis, tasks } = plugin.settings.app;

    const queue = kue.createQueue({
        redis: {
            port: redis.port,
            host: redis.host,
        },
    });

    queue.on('error', (err) =>
        plugin.log(['error', 'tasks'], err)
    );

    queue.on('enqueue', () =>
        plugin.log(['error', 'tasks'], 'enqueue')
    );


    plugin.log(
        ['info', 'tasks'],
        `task runner need redis on ${redis.host}:${redis.port}`
    );

    Object.keys(tasks).forEach((taskName) => {
        let taskConfig = tasks[taskName];
        let taskHandler;
        if (typeof taskConfig === 'object') {
            taskHandler = taskConfig.run;
        } else {
            taskHandler = taskConfig;
            taskConfig = { concurrency: 1 };
        }

        const taskFn = (job, done) => taskHandler(plugin, options, job, done);

        queue.process(taskName, taskConfig.concurrency, taskFn);
        plugin.log(['info', 'tasks'], `register task "${taskName}"`);
    });

    return {
        enqueue: (taskName, _data, _done) => {
            let callback = _done;
            let data = _data;
            if (typeof data === 'function') {
                callback = data;
                data = null;
            }

            const job = queue.create(taskName, data);

            job.removeOnComplete(true);
            job.save((err) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, job);
            });
        },
    };
};


export default function initTasks(plugin, options) {
    return _.isEmpty(plugin.settings.tasks) ? {} : registerTasks(plugin, options);
}
