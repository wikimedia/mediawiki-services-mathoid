module.exports = {
    /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
    apps : [

    // First application
        {
            name      : 'mathoid',
            script    : 'server.js',
            args      : '-c config.dev.yaml',
            watch     : true
        },

    ]
};
