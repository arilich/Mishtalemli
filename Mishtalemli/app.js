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
            ebaysearch(request.payload.search);
        }else{
            reply.view('search.html', {email: request.payload.email});
        }
    }
});


server.start(function () {
    console.log('Server running at:', server.info.uri);
});

function ebaysearch(keywords) {
    // example simple request to FindingService:findItemsByKeywords

    var ebay = require('ebay-api');

    var id = 'nonamec97-dbe0-4791-9985-731e31e5d36';

    var params = {};

    params.keywords = [keywords];

// add additional fields
//params.outputSelector = [ 'AspectHistogram' ];

//params['paginationInput.entriesPerPage'] = 5;


    var filters = {};

//filters.itemFilter = [
//    new ebay.ItemFilter("FreeShippingOnly", true)
//];

//filters.domainFilter = [
//    new ebay.ItemFilter("domainName", "Digital_Cameras")
//];


    ebay.ebayApiGetRequest({
            serviceName: 'FindingService',
            opType: 'findItemsByKeywords',
            appId: id,      // FILL IN YOUR OWN APP KEY, GET ONE HERE: https://publisher.ebaypartnernetwork.com/PublisherToolsAPI
            params: params,
            filters: filters,
            parser: ebay.parseItemsFromResponse    // (default)
        },
        // gets all the items together in a merged array
        function itemsCallback(error, items) {
            if (error) throw error;

            console.log('Found', items.length, 'items');
            
            for (var i = 0; i < items.length; i++) {
                console.log('- ' + items[i].title);
            }
        }
    );
}