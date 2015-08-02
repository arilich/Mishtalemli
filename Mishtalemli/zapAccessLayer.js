module.exports = function () {
    var Promise;
    var cheerio;
    var request;

    function setup() {
        cheerio = require('cheerio');
        request = require('request');
        Promise = require('bluebird');
    }

    // Return the title of the first item
    function getItemTitle(html, modelUri) {
        var title;
        $ = cheerio.load(html);
        $('a').each(function (i, a) {
            if (a.attribs.href === modelUri) {
                if (a.children) {
                    a.children.forEach(function (child) {
                        if (child.data && child.data.replace(/\r|\n\s+/g, '') != '') {
                            title = child.data;
                            var englishStart = title.match('\\w');
                            if (englishStart != null) {
                                title = title.substring(title.indexOf(englishStart[0]));
                            }
                        }
                    });
                }
            }
        });
        return title;
    };

    function search(keyword) {
        var priceResultsArray = [];
        var defer = Promise.defer();
        var itemTitle;
        var url = 'http://www.zap.co.il/search.aspx?keyword=' + encodeURIComponent(keyword);
        request({
            method: 'GET',
            url: url
        }, function (err, response, html) {
            if (err) throw err;
            // OK
            if (response.statusCode == 200) {
                var modelUri;
                var counter = 0;
                $ = cheerio.load(html);
                $('body').find('div .ProductBox.CompareModel').each(function (i, div) {
                    // For now, takes only the first comparison result
                    if (counter < 1) {
                        counter++;
                        div.children.forEach(function (child) {
                            if (child.attribs) {
                                if (child.attribs.class == 'Prices') {
                                    $('body').find(child).each(function (i, pricesClass) {
                                        pricesClass.children.forEach(function (pricesChild) {
                                            if (pricesChild.name == 'a') {
                                                modelUri = pricesChild.attribs.href;
                                                itemTitle = getItemTitle(html, modelUri);
                                            }
                                        });
                                    });
                                }
                            }
                        });
                    }
                });
                request({
                    method: 'GET',
                    url: 'http://www.zap.co.il' + modelUri
                }, function (err, response, html) {
                    if (err) throw err;
                    // OK
                    if (response.statusCode == 200) {
                        $ = cheerio.load(html);
                        $('body').find('div .FinalPrice').each(function (i, item) {
                            item.children.forEach(function (child) {
                                if (child.attribs) {
                                    if (child.attribs.class = 'FinalPrice') {
                                        child.children.forEach(function (priceNum) {
                                            var data = priceNum.data;
                                            var res = data.match('[0-9]+,?[0-9]+');
                                            if (res != null) {
                                                // Price
                                                priceResultsArray.push(res[0]);
                                            }
                                        });
                                    }
                                }
                            });
                        });
                        defer.resolve({Price: priceResultsArray, Title: itemTitle});
                    }
                });
            }
        });

        return defer.promise;
    }

    return {
        setup: setup,
        search: search
    };
};