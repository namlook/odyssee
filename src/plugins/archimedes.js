
import { triplestore } from 'archimedes';
import { pascalCase } from '../utils';
import _ from 'lodash';

const register = function archimedesPlugin(plugin, options, next) {
    let { log } = options;
    const { schemas } = options;

    if (log) {
        log = _.isArray(log) ? log : [log];

        plugin.on('log', (message) => {
            if (message.tags.indexOf('database') > -1) {
                if (_.intersection(message.tags, options.log).length) {
                    console.log(message.tags, message.data);
                }
            }
        });
    }

    let db;
    const models = {};
    if (options.database.adapter === 'rdf') {
        db = triplestore(options.database.config);
    } else {
        throw new Error('unknown adapter', options.database.adapter);
    }

    Object.keys(schemas)
        .map((modelName) => {
            const infos = schemas[modelName];
            const namePascalCase = pascalCase(modelName);
            return { infos, namePascalCase, name: modelName };
        }).forEach((model) => {
            plugin.log(
                ['info', 'database'],
                `register model ${model.namePascalCase} ` +
                `(with ${Object.keys(model.infos.properties).length} properties)`
            );

            models[model.namePascalCase] = model.infos;
        });

    db.register(models).then(() => {
        plugin.expose('db', db);
        next();
    }).catch((error) => {
        next(error);
    });
};

register.attributes = {
    name: 'archimedes',
};

export { register };
