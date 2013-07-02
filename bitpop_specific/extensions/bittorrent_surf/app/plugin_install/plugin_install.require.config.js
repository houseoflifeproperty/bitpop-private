define([

], function () {

    return {
        paths: {
            //jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min'
            plugin_templates:    './app/plugin_install/templates/templates',
            handlebars:   './app/lib/handlebars'
        },
        shim: {
            handlebars: {
                exports: 'Handlebars'
            },
            plugin_templates: {
                deps: [ 'handlebars' ] //handlebars required by plugin install
            }
        }
    };

});