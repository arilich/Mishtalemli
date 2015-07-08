module.exports = function () {
    var Promise;
    var cheerio;
    var request;

    function setup() {
        cheerio = require('cheerio');
        request = require('request');
        Promise = require('bluebird');
    }

    function search(keyword) {
        var defer = Promise.defer();
        request({
            method: 'GET',
            url: 'http://www.zap.co.il/search.aspx?keyword=' + keyword
        }, function(err, response, html) {
            if (err) throw err;
            // OK
            if (response.statusCode == 200) {
                $ = cheerio.load(html);
                $('body').find('div').each(function(i, div) {
                    if (div.attribs.class == 'ProductBox CompareModel') {
                        if (i == 72) {
                            var modelid = div.attribs['data-model-id'];
                            console.log(modelid);
                            request({
                                method: 'GET',
                                url: 'http://www.zap.co.il/model.aspx?modelid=' + modelid
                            }, function(err, response, html) {
                                if (err) throw err;
                                // OK
                                if (response.statusCode == 200) {
                                    $ = cheerio.load(html);
                                    var priceArray = [];
                                    $('body').find('div').each(function (i, div) {
                                        if (div.attribs.class == 'StoreLine') {
                                            div.children.forEach(function(storeline) {
                                                if (storeline.attribs) {
                                                    if (storeline.attribs.class == 'FinalPrice') {
                                                        storeline.children.forEach(function (pricediv) {
                                                            if (pricediv.attribs) {
                                                                if (pricediv.attribs.class == 'PriceNum') {
                                                                    priceArray.push(pricediv.children[0].data.replace(/ |\n|\r|\r\n/g,''));
                                                                }
                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    });
                                    defer.resolve(priceArray);
                                }
                            });
                        }
                    }
                });
            }
        });
        return defer.promise;
    }

    return {
        setup : setup,
        search : search
    };
}