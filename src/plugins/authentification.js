
import Bcrypt from 'bcrypt';
import _ from 'lodash';


/**
 * set the authentification layer
 */
export default function initAuthentification(plugin) {
    const basicValidation = function basicValidation(request, username, password, callback) {
        const db = plugin.plugins.eureka.database;
        // let UserModel = plugin.plugins.eureka.userModel;
        // let usernameField = plugin.plugins.eureka.usernameField;
        // let passwordField = plugin.plugins.eureka.passwordField;

        const UserModel = 'User';
        const usernameField = 'email';
        const passwordField = 'password';

        const query = { [usernameField]: username };

        db[UserModel].first(query).then((user) => {
            if (user) {
                Bcrypt.compare(
                    password,
                    user.get(passwordField),
                    (compareErr, isValid) => callback(null, isValid, user.attrs())
                );
            }

            return callback(null, false);
        }).catch((err) => callback(err));
    };

    plugin.auth.strategy('simple', 'basic', { validateFunc: basicValidation });


    plugin.auth.strategy('token', 'jwt', {
        key: plugin.settings.app.secret,
        validateFunc: (request, credentials, callback) => {
            /**
             * process the scope
             */
            let { scope } = credentials;

            scope = scope || [];

            if (!_.isArray(scope)) {
                scope = [scope];
            }

            scope = _.flatten(scope);

            /**
             * an authentificated user has the user scope by default
             */
            if (scope.indexOf('user') === -1) {
                scope.push('user');
            }

            credentials.scope = scope; // eslint-disable-line no-param-reassign

            return callback(null, true, credentials);
        },
    });
}
