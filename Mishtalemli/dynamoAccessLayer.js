module.exports = function (configs) {
    var Promise = require('bluebird');
    var AWS;
    var dynamodb;


    function setup() {
        AWS = require("aws-sdk");
        AWS.config.loadFromPath(configs.credentials);
        dynamodb = new AWS.DynamoDB();
        Promise.promisifyAll(dynamodb);
    }

    function getItem(table, key) {
        var defer = Promise.defer();
        var params = {TableName: table, Key: key};
        dynamodb.getItem(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    function getAtomicId() {
        var defer = Promise.defer();
        var params = {TableName: "Counters", Key: {CounterId: {S: "Users"}}};
        dynamodb.getItem(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                var newCount = parseInt(data.Item.Counter.N) + 1;
                var key = {CounterId: {S: "Users"}};
                var attributeUpdate = {
                    Counter: {Action: 'PUT', Value: {N: newCount.toString()}}
                };
                updateItem("Counters", key, attributeUpdate);
                defer.resolve(data);
            }
        });

        return defer.promise;
    }

    function putItem(table, item) {
        var defer = Promise.defer();
        var params = {TableName: table, Item: item};
        dynamodb.putItem(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    function query(table, keyCondition) {
        var defer = Promise.defer();
        var params = {
            TableName: table,
            KeyConditions: keyCondition,
            ScanIndexForward: false
        };

        if (table == 'Recs') {
            params.IndexName = 'UserId-Rank-index';
            params.Limit = 3;
        }

        dynamodb.query(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    function updateItem(table, key, attributeUpdates) {
        var defer = Promise.defer();
        var params = {
            TableName: table,
            Key: key,
            AttributeUpdates: attributeUpdates
        };

        dynamodb.updateItem(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else defer.resolve(data);
        });

        return defer.promise;
    }

    return {
        setup: setup,
        query: query,
        getItem: getItem,
        putItem: putItem,
        updateItem: updateItem,
        getAtomicId: getAtomicId
    };
};