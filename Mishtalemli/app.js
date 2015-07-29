var Path = require('path');
var FS = require('fs');
var Hapi = require('hapi');
var CONFIGS = require('./configs.js');

// Setup dynamo
var dynamo = require('./dynamoAccessLayer')(CONFIGS);
dynamo.setup();

// Setup ebay
var ebay = require('./ebayAccessLayer')();
ebay.setup(CONFIGS.ebayAppId);

// Setup zap
var zap = require('./zapAccessLayer')();
zap.setup();

// Setup amazon
var amazon = require('./amazonAccessLayer')();
amazon.setup();

var server = new Hapi.Server();
server.connection({port: CONFIGS.port});

// Save user query in dynamo
function storeSearche(username, search) {
    throw "Not Implemented";
}

server.views({
    engines: {
        html: require('handlebars')
    },
    relativeTo: __dirname,
    path: './views'
});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply.view('index.html');
    }
});

server.route({
    method: 'POST',
    path: '/',
    handler: function (request, reply) {
        var table = 'Users';
        // Check if request come from register
        if (request.payload.firstname) {
            var queryData = {
                email: request.payload.email,
                password: request.payload.password,
                firstname: request.payload.firstname,
                lastname: request.payload.lastname,
                birthyear: request.payload.birthyear,
                city: request.payload.city,
                gender: request.payload.gender
            };

            var query = {
                Email: {S: queryData.email},
                Password: {S: queryData.password},
                FirstName: {S: queryData.firstname},
                LastName: {S: queryData.lastname},
                Birthyear: {N: queryData.birthyear},
                City: {S: queryData.city},
                Gender: {SS: [queryData.gender]}
            };

            dynamo.putItem(table, query).then(function (data) {
                return reply.view('index.html');
            });
        }

        // Check if request come from sign in
        else if (request.payload.email) {
            var queryData = {
                email: request.payload.email,
                password: request.payload.password
            };

            //check if user exist in dynamodb
            var query = {Email: {S: queryData.email}};
            dynamo.getItem(table, query).then(function (data) {
                console.log(data);
                if (data && data.Item && data.Item.Password.S == queryData.password) {

                    //user exist, redirect to search page
                    return reply.redirect('search').rewritable(false);
                } else {
                    console.log('user does not exist, please check your input or register!');
                    return reply.view('index.html');
                }
            });
        } else {
            console.log('no email');
            return reply.view('index.html');
        }
    }
});

server.route({
    method: 'POST',
    path: '/search',
    handler: function (request, reply) {
        if (request.payload.search) {
            console.log('search start');
            ebay.search(request.payload.search).then(function (ebayResult) {
                zap.search(request.payload.search).then(function (zapResult) {
                    console.log('search end');
                    return reply.view('search.html', {zap: {price: zapResult[0]}, ebay: ebayResult, email: request.payload.email}, {layout: 'layout/layout'});
                });
            });

        } else {
            console.log('search end');
            return reply.view('search_empty.html', {zap: null, ebay: null, email: request.payload.email}, {layout: 'layout/layout'});
        }
    }
});

server.route({
    method: 'GET',
    path: '/register',
    handler: function (request, reply) {
        // Page requeted
        return reply.view('register.html');
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});