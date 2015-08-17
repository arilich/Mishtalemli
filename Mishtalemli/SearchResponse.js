function SearchResponse() {
    this.Title = null;
    this.Price = null;
    this.Link = null;
    this.Image = null;
    this.Id = null;
    this.Refferer = null;
}

SearchResponse.prototype.setup = function () {
};

SearchResponse.prototype.build = function (response, refferer) {
    var searchResponse = new SearchResponse();
    searchResponse.Refferer = refferer;
    if (response) {
        if (refferer == 'ebay') {
            searchResponse.Title = response.title;
            searchResponse.Price = '$' + response.sellingStatus.currentPrice.USD;
            searchResponse.Link = response.viewItemURL;
            searchResponse.Image = response.galleryURL;
            searchResponse.Id = response.itemId;
        } else if (refferer == 'amazon') {
            searchResponse.Title = response.ItemSearchResponse.Items[0].Item[0].ItemAttributes[0].Title[0];
            searchResponse.Price = response.price;
            searchResponse.Link = response.ItemSearchResponse.Items[0].Item[0].DetailPageURL[0];
            if (response.ItemSearchResponse.Items[0].Item[0].MediumImage) {
                searchResponse.Image = response.ItemSearchResponse.Items[0].Item[0].MediumImage[0].URL[0];
            } else if (response.ItemSearchResponse.Items[0].Item[0].ImageSets) {
                searchResponse.Image = response.ItemSearchResponse.Items[0].Item[0].ImageSets[0].ImageSet[0].MediumImage[0].URL[0];
            }
            searchResponse.Id = response.ItemSearchResponse.Items[0].Item[0].ASIN[0];
        } else if (refferer == 'zap') {
            searchResponse.Title = response.Title;
            searchResponse.Price = response.Price;
            searchResponse.Link = response.Link;
            searchResponse.Image = response.Image;
            searchResponse.Id = response.Id;
        }
    }
    return searchResponse;
};

SearchResponse.prototype.isEmpty = function (searchResponse) {
    if (searchResponse.Title == null &&
        searchResponse.Price == null &&
        searchResponse.Link == null &&
        searchResponse.Image == null &&
        searchResponse.Id == null) {
        return true;
    } else {
        return false;
    }
};
var searchResponse = new SearchResponse();
searchResponse.setup();
module.exports = searchResponse;