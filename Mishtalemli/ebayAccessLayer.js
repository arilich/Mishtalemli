module.exports = function () {
    var Promise = require('bluebird');
    var ebay;
    var id;

    function setup(companyid) {
        ebay = require('ebay-api');
        id = companyid;
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
            new ebay.ItemFilter('AuthorizedSellerOnly', true),
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
                console.log('Found', items.length, 'items');
                for (var i = 0; i < items.length; i++) {
                    console.log('- ' + items[i].title);
                }
                console.log(items[0]);
                defer.resolve(items[0]);
            }
        );
        return defer.promise;
    }

    return {
        setup: setup,
        search: search
    };
};