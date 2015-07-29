module.exports = function () {
    var Promise = require('bluebird');
    var opHelper;
    var cheerio = require('cheerio');
    var request = require('request');

    function setup() {
        var util = require('util'),
            OperationHelper = require('apac').OperationHelper;

        opHelper = new OperationHelper({
            awsId: 'AKIAIGLSJJ63XFFC2CVA',
            awsSecret: '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',
            assocId: 'mishtalemli-20',
            // xml2jsOptions: an extra, optional, parameter for if you want to pass additional options for the xml2js module. (see https://github.com/Leonidas-from-XIV/node-xml2js#options)
            version: '2013-08-01'
            // your version of using product advertising api, default: 2013-08-01
        });
    }

    function search(query) {

        var defer = Promise.defer();

        opHelper.execute('ItemSearch', {
            'SearchIndex': 'All',
            'Keywords': query,
            'ResponseGroup': 'ItemAttributes,Offers,OfferListings,OfferFull'
        }, function (err, results) { // you can add a third parameter for the raw xml response, "results" here are currently parsed using xml2js
            if (err) console.log(err);
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
                    defer.resolve(price);
                });
            } else {
                var price = results.ItemSearchResponse.Items[0].Item[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0];
                defer.resolve(price);
            }
            // Lowest Price
            //console.log(results.ItemSearchResponse.Items[0].Item[0].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0]);
            // Amazon offer listing - Prime
            //console.log(results.ItemSearchResponse.Items[0].Item[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0])
        });

        return defer.promise;
    }

    return {
        setup: setup,
        search: search
    };
};
