module.exports = function (configs) {
    var Promise = require('bluebird');
    var AWS;
    var dynamodb;
    var table;


    function setup(tableName) {
        table = tableName;
        AWS = require("aws-sdk");
        AWS.config.loadFromPath(configs.credentials);
        dynamodb = new AWS.DynamoDB();
        Promise.promisifyAll(dynamodb);
    }

    function getItem(key) {
        var defer = Promise.defer();
        var params = {TableName : table, Key : key};
        console.log(params);
        dynamodb.getItem(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    function putItem(item) {
        var defer = Promise.defer();
        var params = {TableName : table, Item : item};
        dynamodb.putItem(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    function query(query, indexName) {
        var defer = Promise.defer();
        var params = {TableName : table, KeyConditions : query, ScanIndexForward : false, IndexName : indexName};
        dynamodb.query(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    return {
        setup : setup,
        query : query,
        getItem : getItem,
        putItem : putItem
    };
};