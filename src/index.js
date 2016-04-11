
import joi from 'joi';
import Glue from 'glue';
// import Inert from 'inert';
// import HapiMailer from 'hapi-mailer';
// import HapiAuthBasic from 'hapi-auth-basic';
// import HapiAuthJwt from 'hapi-auth-jwt';
// import HapiQs from 'hapi-qs';
// import archimedesPlugin from './plugins/archimedes';
// import odysseePlugin from './plugins/odyssee';

import Promise from 'bluebird';

const odysseeConfigValidator = {
    name: joi.string(),
    host: joi.string().required(),
    port: joi.number().required(),
    log: [joi.string(), joi.array(joi.string())],
    auth: joi.boolean(),
    CLI: joi.boolean().default(false),
    app: joi.object().keys({
        secret: joi.string().required(),
        apiRootPrefix: joi.string().required(),
        email: joi.string().email().required(),
        clientRootUrl: joi.string().uri().required(),
    }),
    publicDirectory: joi.string().default('dist'),
    database: joi.object().keys({
        adapter: joi.string().required().only(['rdf']),
        schemas: joi.object(),
        config: joi.object().keys({
            engine: joi.string().required().only(['virtuoso', 'blazegraph', 'stardog']),
            graphUri: joi.string().uri().required(),
            host: joi.string().required(),
            port: joi.number(),
            auth: joi.object().keys({
                user: joi.string().required(),
                password: joi.string().required(),
            }).with('user', 'password'),
        }).required(),
    }),
    redis: joi.object().keys({
        port: joi.number().required(),
        host: joi.string().required(),
    }),
    fileUploads: joi.object().keys({
        maxBytes: joi.number().integer().default(50 * Math.pow(1024, 2)),
        uploadDirectory: joi.string().default(),
    }),
    resources: joi.object(),
    tasks: joi.object(),
    mailer: joi.object(),
    misc: joi.object(), // place to put custom config here
};

export default function eurekaServer(config) {
    const { error, value: serverConfig } = joi.validate(config, odysseeConfigValidator);

    if (error) {
        throw error;
    }


    const hooks = {
        beforeCompose(manifest, next) {
            next();
        },

        beforeStart(server, next) {
            next();
        },

        afterStart(server, next) {
            next();
        },
    };

    const archimedesPluginConfig = {
        log: serverConfig.log,
        database: {
            adapter: serverConfig.database.adapter,
            config: serverConfig.database.config,
        },
        schemas: serverConfig.database.schemas,
    };

    const manifest = {
        server: {
            app: serverConfig,
        },
        connections: [
            {
                port: serverConfig.port,
                routes: { cors: true },
            },
        ],
        registrations: [
            { plugin: { register: 'hapi-qs' } },
            { plugin: { register: 'inert' } },
            // { register: HapiMailer, options: config.mailer },
            // HapiAuthBasic,
            // HapiAuthJwt,
            {
                plugin: {
                    register: './plugins/archimedes',
                    options: archimedesPluginConfig,
                },
            },
            {
                plugin: {
                    register: './plugins/core',
                    options: serverConfig,
                },
            },
        ],
    };


    /**
     * compose the server and register plugins
     */
    const compose = function compose(callback) {
        const composeOptions = { relativeTo: __dirname };

        hooks.beforeCompose(manifest, (beforeRegisterErr) => {
            if (beforeRegisterErr) {
                return callback(beforeRegisterErr);
            }

            return Glue.compose(manifest, composeOptions, (composeErr, server) => {
                if (composeErr) {
                    return callback(composeErr);
                }

                return callback(null, server);
            });
        });
    };

    return {
        manifest,
        hooks,

        /**
         * compose, register plugins and start the server
         *
         * @returns a promise which resolve into the started server
         */
        start() {
            return new Promise((resolve, reject) => {
                compose((composeErr, server) => {
                    if (composeErr) {
                        return reject(composeErr);
                    }

                    return hooks.beforeStart(server, (beforeStartErr) => {
                        if (beforeStartErr) {
                            return reject(beforeStartErr);
                        }

                        return server.start(() => {
                            hooks.afterStart(server, (afterStartErr) => {
                                if (afterStartErr) {
                                    return reject(afterStartErr);
                                }
                                return resolve(server);
                            });
                        });
                    });
                });
            });
        },
    };
}
