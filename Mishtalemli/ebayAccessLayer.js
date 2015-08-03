module.exports = function () {
    var Promise = require('bluebird');
    var ebay;
    var id;
    var searchResponse;

    function setup(companyid) {
        ebay = require('ebay-api');
        id = companyid;
        searchResponse = require('./SearchResponse');
    }

    function search(keywords) {
        var defer = Promise.defer();
        var params = {};
        params.keywords = [keywords];
        // add additional fields
        //params.outputSelector = [ 'AspectHistogram' ];
        params['paginationInput.entriesPerPage'] = 1;

        var filters = {};
        //filters.itemFilter = [
        //  new ebay.ItemFilter("FreeShippingOnly", true)
        //];
        filters.itemFilter = [
            //new ebay.ItemFilter('AuthorizedSellerOnly', true),
            new ebay.ItemFilter('AvailableTo', 'IL'),
            new ebay.ItemFilter('Condition', 'New'),
            new ebay.ItemFilter('HideDuplicateItems', true)
        ];

        //filters.domainFilter = [
        //    new ebay.ItemFilter("domainName", "Digital_Cameras")
        //];

        ebay.ebayApiGetRequest({
                serviceName: 'FindingService',
                opType: 'findItemsAdvanced',
                appId: id,      // FILL IN YOUR OWN APP KEY, GET ONE HERE: https://publisher.ebaypartnernetwork.com/PublisherToolsAPI
                params: params,
                filters: filters,
                parser: ebay.parseItemsFromResponse    // (default)
            },

            // gets all the items together in a merged array
            function itemsCallback(error, items) {
                if (error) throw error;
                if (items) {
                    var response = searchResponse.build(items[0], 'ebay');
                    defer.resolve(response);
                }
            }
        );
        return defer.promise;
    }

    return {
        setup: setup,
        search: search
    };
};