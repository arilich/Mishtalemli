var Path = require('path');
var Hapi = require('hapi');
var Promise = require('bluebird');
var CONFIGS = require('./configs.js');
var searchResponse = require('./SearchResponse.js');
// Setup dynamo
var dynamo = require('./dynamoAccessLayer')(CONFIGS);
dynamo.setup();

// Setup ebay
var ebay = require('./ebayAccessLayer')();
ebay.setup(CONFIGS.ebayAppId);
//ebay.searchComputer()

// Setup zap
var zap = require('./zapAccessLayer')();
zap.setup();

// Setup amazon
var amazon = require('./amazonAccessLayer')();
amazon.setup(CONFIGS.credentials);

var server = new Hapi.Server();
server.connection(
    {
        port: CONFIGS.port,
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    }
);

// Save user query in dynamo
function storeSearch(username, zapId, zapTitle) {
    var table = 'Search';

    dynamo.query('Users', {
        'Email': {
            ComparisonOperator: 'EQ',
            AttributeValueList: [{'S': username}]
        }
    }).then(function (user) {
        var keyCondition =
        {
            'UserId': {
                ComparisonOperator: 'EQ',
                AttributeValueList: [{'S': user.Items[0].UserId.S}]
            },
            'ZapId': {
                ComparisonOperator: 'EQ',
                AttributeValueList: [{'S': zapId}]
            }
        };
        dynamo.query(table, keyCondition).then(function (result) {
            // First time search
            if (result.Count == 0) {
                var input = {
                    UserId: {S: user.Items[0].UserId.S},
                    ZapId: {S: zapId},
                    Rank: {S: '1'},
                    ZapTitle: {S: zapTitle}
                };
                dynamo.putItem(table, input).then(function (putItemResult) {
                });
                // Update search rank
            } else {
                var newCount = parseInt(result.Items[0].Rank.S, 10) + 1;
                var key = {UserId: {S: user.Items[0].UserId.S}, ZapId: {S: zapId}};
                var attributeUpdate = {
                    'Rank': {
                        Action: 'PUT',
                        Value: {S: newCount.toString()}
                    }
                };
                dynamo.updateItem(table, key, attributeUpdate).then(function (updateItemResult) {
                });
            }
        });
    });
}

// Get user recommendation
function getRecommendations(username) {
    var defer = Promise.defer();
    dynamo.query('Users', {
        'Email': {
            ComparisonOperator: 'EQ',
            AttributeValueList: [{'S': username}]
        }
    }).then(function (user) {
        var keyCondition =
        {
            'UserId': {
                ComparisonOperator: 'EQ',
                AttributeValueList: [{'S': user.Items[0].UserId.S}]
            }
        };

        dynamo.query('Recommendations', keyCondition).then(function (recommendations) {
            if (recommendations.Count > 0) {
                console.log(recommendations.Items[0].Recommendations.SS);

                // Assuming in Rank order
                var firstRecZapId = recommendations.Items[0].Recommendations.SS[0];
                firstRecZapId = firstRecZapId.substring(1, firstRecZapId.length - 1).split(',')[0].substring(0, firstRecZapId.indexOf(':') - 1).toString();
                console.log(firstRecZapId);
                var getTitleKeyCondition = {
                    ItemId: {
                        ComparisonOperator: 'EQ',
                        AttributeValueList: [{'S': firstRecZapId}]
                    }
                };

                // Get recommendation title
                dynamo.query('Items', getTitleKeyCondition).then(function (itemResult) {
                    console.log(itemResult);
                    if (itemResult.Count > 0) {
                        // TODO: parse object from SearchResponse
                        var itemDetails = JSON.parse(itemResult.Items[0].Details.S);
                        defer.resolve(itemDetails);
                    } else {
                        // No title match found - shouldn't happen
                        defer.resolve(null);
                    }
                });
            } else {
                // No recommendations
                defer.resolve(null);
            }
        });
    });

    return defer.promise;
}

server.views({
    engines: {
        html: require('handlebars')
    },
    relativeTo: __dirname,
    path: './views'
});

// Get static resources from folder 'public'
server.route({
    method: 'GET',
    path: '/{file}.{extension}',
    handler: function (request, reply) {
        var path = request.params.file + '.' + request.params.extension;
        reply.file(path);
    }
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
            var query = {
                Email: {S: request.payload.email},
                Password: {S: request.payload.password},
                FirstName: {S: request.payload.firstname},
                LastName: {S: request.payload.lastname},
                Birthyear: {N: request.payload.birthyear},
                City: {S: request.payload.city},
                Gender: {SS: [request.payload.gender]}
            };

            //Get atomic/unique id for the singed-up user
            //and save its details
            dynamo.getAtomicId().then(function (atomicId) {
                query.UserId = {S: atomicId.Item.Counter.N.toString()};
                dynamo.putItem(table, query).then(function (data) {
                    return reply.view('index.html');
                });
            });
        }

        // Check if request come from sign in
        else if (request.payload.email) {
            var keyCondition =
            {
                'Email': {
                    ComparisonOperator: 'EQ',
                    AttributeValueList: [{'S': request.payload.email}]
                }
            };

            //check if user exist in dynamodb
            dynamo.query(table, keyCondition).then(function (data) {
                if (data && data.Items && data.Items[0].Password.S == request.payload.password) {
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
        var username = request.payload.email;
        if (request.payload.search) {
            console.log('zap search start');
            zap.search(request.payload.search).then(function (zapResult) {

                if (searchResponse.isEmpty(zapResult)) {
                    return reply.view('search.html', {
                        zap: null,
                        ebay: null,
                        amazon: null,
                        email: request.payload.email
                    }, {layout: 'layout/layout'});
                }

                console.log('zap search end');
                console.log('ebay search start');
                ebay.search(zapResult.Title).then(function (ebayResult) {
                    console.log('ebay search end');
                    console.log('amazon search start');
                    amazon.search(zapResult.Title).then(function (amazonResult) {
                        var itemDetails = {Zap: zapResult, Ebay: ebayResult, Amazon: amazonResult};
                        var searchItem = {ItemId: {S: zapResult.Id}, Details: {S: JSON.stringify(itemDetails)}};
                        dynamo.putItem("Items", searchItem).then(function (data) {
                            storeSearch(username, zapResult.Id, zapResult.Title);
                            console.log('amazon search end');
                            console.log('zapResult: ' + JSON.stringify(zapResult));
                            console.log('ebayResult: ' + JSON.stringify(ebayResult));
                            console.log('amazonResult: ' + JSON.stringify(amazonResult));

                            return reply.view('search.html', {
                                zap: zapResult,
                                ebay: ebayResult,
                                amazon: amazonResult,
                                email: request.payload.email
                            }, {layout: 'layout/layout'});
                        });
                    });
                });
            });
        } else {
            getRecommendations(username).then(function (recommendations) {
                //var recommendations = recommendations;
                return reply.view('search_empty.html', {
                    recommendations: recommendations,
                    zap: null,
                    ebay: null,
                    amazon: null,
                    email: request.payload.email
                }, {layout: 'layout/layout'});
            });
        }
    }
})
;

server.route({
    method: 'GET',
    path: '/register',
    handler: function (request, reply) {
        // Page requested
        return reply.view('register.html');
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});