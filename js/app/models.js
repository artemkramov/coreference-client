const { Model } = Backbone;
const { Behavior } = Marionette;

/**
 * Global channel for the message exchange
 */
const basicRadioChannel = Backbone.Radio.channel('basic');

/**
 * All events for the global channel
 */
const basicRadioChannelEvents = {
    radioEventFileSelected: 'file:selected',
    radioEventFileGetText: 'file:getText',
    radioEventPreloaderShow: 'preloader:show',
    radioEventPreloaderHide: 'preloader:hide',
    radioEventPageChange: 'page:change',
    radioEventEntitySelect: 'entity:select',
    radioEventEntityGetSelected: 'entity:getSelected',
    radioEventEntityAddToCluster: 'entity:addToCluster',
    radioEventEntityRemoveFromCluster: 'entity:removeFromCluster',
    radioEventEntityRetrieve: 'entity:retrieve',
    radioEventClusterSizeChange: 'cluster:sizeChange',
    radioEventNotification: 'notification:push'
};

const hostIP = "http://localhost:8090";
const urlExtract = '/extract';
const urlSave = '/save';

const errorMessages = {
    "serverError": "Server error",
    "emptyEntities": "No entity was found in the text"
};

var PageTextboxModel = Model.extend({
    defaults: {
        fileText: ""
    }
});

var PageParsedModel = Model.extend({

});

var ApiModel = Model.extend({

    /**
     * Send JSON request to server
     * @param uri
     * @param options
     * @returns {*}
     */
    sendJSONRequest: function (uri, options) {
        let ajaxOptions = _.extend({
            cache: false,
            dataType: 'json',
            url: hostIP + uri,
            contentType: 'application/json',
            success: function (response) {
                if (_.isNull(response) || _.isUndefined(response)) {
                    return deferred.reject();
                }
                return deferred.resolve(response);
            },
            error: function () {
                return deferred.reject();
            }
        }, options);
        var deferred = $.Deferred();
        $.ajax(ajaxOptions);
        return deferred.promise();
    }
});

var NLPModel = ApiModel.extend({

    defaults: {
        clusters: []
    },

    saveTokens: function (tokens) {
        let deferred = $.Deferred();
        let options = {
            data: JSON.stringify(tokens),
            type: "post"
        };
        this.sendJSONRequest(urlSave, options).done(function () {
            return deferred.resolve();
        }).fail(function () {
            return deferred.reject(errorMessages.serverError);
        });
        return deferred.promise();
    },

    extractEntitiesFromText: function (text) {
        let self = this;
        let deferred = $.Deferred();
        let options = {
            data: JSON.stringify({"text": text}),
            type: "post"
        };
        this.sendJSONRequest(urlExtract, options).done(function (response) {
            if (_.isEmpty(response.entities)) {
                return deferred.reject(errorMessages.emptyEntities);
            }
            /**
             * Save full response to local storage as global object
             */
            localStorage.setItem('parsedText', JSON.stringify(response));

            /**
             * Parse response and prepare data for collection view
             */
            let items = [];
            let counter = 0;
            let entityNumber = 0;
            while (counter < response.tokens.length) {
                let token = response.tokens[counter];
                let dataItem = {
                    isSelected: false,
                    word: '',
                    isEntity: false,
                    groupID: null,
                    groupWords: [],
                    entityNumber: entityNumber,
                    clusterID: null
                };
                if (!_.isNull(token.groupID)) {
                    dataItem.isEntity = true;
                    dataItem.word = token.groupWord;
                    dataItem.groupID = token.groupID;
                    let i = counter;
                    for (i = counter; i < counter + token.groupLength; i++) {
                        dataItem.groupWords.push({
                            word: response.tokens[i].word,
                            tag: response.tokens[i].tag
                        })
                    }
                    counter += token.groupLength;
                }
                else {
                    if (token.isEntity) {
                        dataItem.isEntity = true;
                    }
                    dataItem.word = token.word;
                    dataItem.tag = token.tag;
                    counter++;
                }
                items.push(dataItem);
                entityNumber++;
            }
            return deferred.resolve(items);
        }).fail(function () {
            return deferred.reject(errorMessages.serverError);
        });
        return deferred.promise();
    }

});


/**
 * Notification model
 * It is used to propagate the message to the notification block
 */
var NotificationModel = Model.extend({
    initialize: function (options) {
        /**
         * Check if the message is passed in the arguments
         * In other case reset the notification block
         */
        if (!_.isUndefined(options) && _.isObject(options)) {
            this.setMessage(options.message);
        }
        else {
            this.setMessage();
        }
        basicRadioChannel.on(basicRadioChannelEvents.radioEventNotification, this.setMessage, this);
    },
    /**
     * Set the notification block with the appropriate message and status
     * @param message
     * @param status
     */
    setMessage: function (message, status) {
        if (!_.isUndefined(message)) {
            let n  = new Noty({
                type: status,
                text: message,
                layout: 'bottomCenter',
                timeout: false,
                theme: 'metroui'
            });
            n.show();
        }
        else {
            Noty.closeAll();
        }
    },
    /**
     * Default message for the notification block
     * @returns {*}
     */
    getDefaultMessage: function () {
        return "Default message";
    }
});