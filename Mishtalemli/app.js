var FS = require('fs');
var Hapi = require('hapi');
var CONFIGS = JSON.parse(FS.readFileSync('./configs.json').toString());
var dynamo = require('./dynamoAccessLayer')(CONFIGS);
dynamo.setup('Users');

var query = {Email: {S: 'test@gmail.com'}};
dynamo.getItem(query).then(function (data) {
    console.log('data: ', data);
});
var server = new Hapi.Server();
server.connection({ port: CONFIGS.port });

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
        if (request.payload.email) {
            var data = {email : request.payload.email, password : request.payload.password};
            console.log(data);
            reply.view('search.html', data);
        } else {
            console.log('no email');
        }
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});