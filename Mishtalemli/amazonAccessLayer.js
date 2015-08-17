module.exports = function () {
    var Promise = require('bluebird');
    var opHelper;
    var cheerio = require('cheerio');
    var request = require('request');
    var searchResponse;

    var NoMatchFound = 'AWS.ECommerceService.NoExactMatches';

    function setup(credentialsPath) {
        var fs = require('fs');
        var credentials = JSON.parse(fs.readFileSync(credentialsPath));
        searchResponse = require('./SearchResponse');

        var util = require('util'),
            OperationHelper = require('apac').OperationHelper;

        opHelper = new OperationHelper({
            awsId: credentials.accessKeyId,
            awsSecret: credentials.secretAccessKey,
            assocId: 'mishtalemli-20',
            // xml2jsOptions: an extra, optional, parameter for if you want to pass additional options for the xml2js module. (see https://github.com/Leonidas-from-XIV/node-xml2js#options)
            version: '2013-08-01'
            // your version of using product advertising api, default: 2013-08-01
        });
    }

    function search(query) {
        var defer = Promise.defer();
        var response;
        opHelper.execute('ItemSearch', {
            'SearchIndex': 'All',
            'Keywords': query,
            'ResponseGroup': 'ItemAttributes,Offers,OfferListings,OfferFull,Images'
        }, function (err, results) { // you can add a third parameter for the raw xml response, "results" here are currently parsed using xml2js
            // API Error
            if (err) console.log(err);
            // No Match Found
            else if (results.ItemSearchResponse.Items[0].Request[0].Errors) {
                if (results.ItemSearchResponse.Items[0].Request[0].Errors[0].Error[0].Code[0] === NoMatchFound) {
                    response = searchResponse.build(undefined, 'amazon');
                    defer.resolve(response);
                }
            }
            // Match found - No Errors
            else {
                // If hidden price
                if (results.ItemSearchResponse.Items[0].Item[0].Offers[0].Offer) {
                    if (results.ItemSearchResponse.Items[0].Item[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0] === 'Too low to display') {
                        var ptd = results.ItemSearchResponse.Items[0].Item[0].ItemAttributes[0].ProductTypeName[0]
                        var asin = results.ItemSearchResponse.Items[0].Item[0].ASIN[0];
                        var priceUrl = 'http://www.amazon.com/gp/product/ajax-handlers/generic-hlcx.html?ie=UTF8&ptd=' + ptd + '&useTwister=true&viewId=MAP_AJAX&ASIN=' + asin + '&optionalParams={"mapPopover":"true","coliid":null,"colid":null,"isPrime":"0"}&wdg=pc_display_on_website&isVariationalParent=false';
                        request({
                            method: 'GET',
                            url: priceUrl
                        }, function (err, response, body) {
                            if (err) return console.error(err);
                            $ = cheerio.load(body);
                            var price = $('span#priceblock_ourprice').html();
                            results.price = price;
                            response = searchResponse.build(results, 'amazon');
                            defer.resolve(response);
                        });
                        // No hidden price
                    } else {
                        var price = results.ItemSearchResponse.Items[0].Item[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0];
                        results.price = price;
                        response = searchResponse.build(results, 'amazon');
                        defer.resolve(response);
                    }
                } else {
                    defer.resolve(null);
                }
                // Lowest Price
                //console.log(results.ItemSearchResponse.Items[0].Item[0].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0]);
                // Amazon offer listing - Prime
                //console.log(results.ItemSearchResponse.Items[0].Item[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0])
            }
        });

        return defer.promise;
    }

    return {
        setup: setup,
        search: search
    };
};
