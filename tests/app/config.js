/* jshint node: true */

import schemas from './schemas';
import { importDir } from '../../src/utils';

module.exports = {
  name: 'test',
  host: '0.0.0.0',
  port: 8888,
  log: ['info', 'warn'],
  app: {
    secret: 'thebigsecret',
    email: 'test@bla.com',
    clientRootUrl: 'http://test.odyssee.org',
    apiRootPrefix: '/api/1',
  },
  // resources: requireDir('./resources'),
  // tasks: requireDir('./tasks'),
  resources: importDir(`${__dirname}/resources`),
  publicDirectory: 'dist',
  fileUploads: {
    uploadDirectory: './uploads',
    maxBytes: 50, // 50 MB
  },
  database: {
    adapter: 'rdf',
    config: {
      engine: 'blazegraph',
      graphUri: 'http://test.odyssee.org',
      port: 9999,
      host: 'localhost',
    },
    schemas, // requireDir('./schemas'),
  },
  // redis: {
  //     port: internals.redis.port,
  //     host: internals.redis.host
  // },
  misc: {
    // kue: {
    //     port: 3050
    // },
    // virtuoso: {
    //     password: process.env.DB_ENV_DBA_PASSWORD
    // },
    // redis: {
    //     port: 6379,//process.env.REDIS_PORT_6379_TCP_PORT,
    //     // host: 'redis'//process.env.REDIS_PORT_6379_TCP_ADDR
    //     host: internals.redisHost
    // }
  },
};
