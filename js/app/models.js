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
    radioEventProductAdd: 'product:add',
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

const hostIP = "";

var PageTextboxModel = Model.extend({
    defaults: {
        fileText: ""
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
        if (_.isUndefined(message)) {
            message = this.getDefaultMessage();
        }
        this.set('status', status);
        this.set('message', message);
    },
    /**
     * Default message for the notification block
     * @returns {*}
     */
    getDefaultMessage: function () {
        return "Default message";
    }
});