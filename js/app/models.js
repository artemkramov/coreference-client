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
    radioEventProductClear: 'product:clear',
    radioEventProductSelect: 'product:select',
    radioEventProductDeselect: 'product:deselect',
    radioEventProductRemove: 'product:remove',
    radioEventProductUpdate: 'product:update',
    radioEventProductEditShow: 'product:editShow',
    radioEventProductEditHide: 'product:editHide',
    radioEventDiscountSubtotalAdd: 'discount:add',
    radioEventTotalSumRecount: 'product:recountSum',
    radioReturnTotalSum: 'product:getTotalSum',
    radioEventNotification: 'notification:push',
    radioEventScanningModeOn: 'scanning:on',
    radioEventScanningModeOff: 'scanning:off',
    radioEventScanningKeyDown: 'scanning:keydown',
    radioEventPageChange: 'page:change',
    radioEventKeyboardKeyPress: 'keyboard:keypress',
    radioEventKeyboardShow: 'keyboard:show',
    radioEventKeyboardHide: 'keyboard:hide',
    radioEventUserLogout: 'user:logout'
};

const hostIP = "http://localhost:8090";
const urlExtract = '/extract';

const errorMessages = {
    "serverError": "Server error"
};

var PageTextboxModel = Model.extend({
    defaults: {
        fileText: ""
    }
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

    extractEntitiesFromText: function (text) {
        let deferred = $.Deferred();
        let options = {
            data: JSON.stringify({"text": text}),
            type: "post"
        };
        this.sendJSONRequest(urlExtract, options).done(function (response) {
            return deferred.resolve();
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