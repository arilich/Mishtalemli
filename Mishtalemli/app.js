var FS = require('fs');
var Hapi = require('hapi');
var CONFIGS = JSON.parse(FS.readFileSync('./configs.json').toString());
var dynamo = require('./dynamoAccessLayer')(CONFIGS);
dynamo.setup('Users');

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
            var queryData = {
                email : request.payload.email,
                password : request.payload.password};

            //check if user exist in dynamodb
            var query = {Email: {S: queryData.email}};
            dynamo.getItem(query).then(function (data) {
                if(data && data.Item.Password.S == queryData.password){

                    //user exist, redirect to search page
                    return reply.redirect('search').rewritable(false);
                }else {
                    console.log('user does not exist, please check your input or register!');
                }
            });
        } else {
            console.log('no email');
        }
    }
});

server.route({
    method: 'POST',
    path: '/search',
    handler: function (request, reply) {
        if(request.payload.search){

        }else{
            reply.view('search.html', {email: request.payload.email});
        }
    }
});


server.start(function () {
    console.log('Server running at:', server.info.uri);
});