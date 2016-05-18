
import eureka from '../../src';
import config from './config';


const eurekaServer = eureka(config);

eurekaServer.hooks.beforeStart = (server, next) => {
    server.on('log', (message) => {
        console.log(message.tags, message.data); // eslint-disable-line no-console
    });
    next(null);
};


eurekaServer.start().then((server) => {
    // const db = server.plugins.odyssee.database;
    // db.clear().then(() => {
    //     const FIXTURES = require('./fixtures.json');
    //     db.importStream(FIXTURES)
    //         .stopOnError(console.error)
    //         .done(() => {
    //             server.log(
    //                 'info',
    //                 `Server running at: http://${server.info.address}:${server.info.port}`
    //             );
    //         });
    // });

    server.log(
        'info',
        `Server running at: http://${server.info.address}:${server.info.port}`
    );
}).catch((error) => {
    // console.log(error);
    // console.log(error.stack);
    throw error;
});
