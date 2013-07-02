define({
    load: function (name, req, load, config) {
        //req has the same API as require().
        req([name], function (value) {
            load(value);
        });
    }
});