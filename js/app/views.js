const { View, CollectionView, Region } = Marionette;

var HeaderLoadFileView = View.extend({
    template: _.template($("#header-load-file-template").html()),
    events: {
        "submit #form-select-file": "onFileSelectSubmit",
        "click #btn-recognize": "onBtnRecognize"
    },
    onFileSelectSubmit: function (e) {
        let file = $(e.target).find("#file-select").prop("files")[0];
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onload = function (e) {
            let contents = e.target.result;
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventFileSelected, contents);
        };
        reader.readAsText(file);
        return false;
    },
    onBtnRecognize: function () {
        let text = basicRadioChannel.request(basicRadioChannelEvents.radioEventFileGetText);
        basicRadioChannel.trigger(basicRadioChannelEvents.radioEventPreloaderShow);
        this.model.extractEntitiesFromText(text).done(function (parsedData) {
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventPageChange, "parsed", parsedData);
        }).fail(function (errorMessage) {
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventNotification, errorMessage, "error");
        }).always(function () {
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventPreloaderHide);
        });
    }
});

var HeaderSaveClustersView = View.extend({
    template: _.template($("#header-save-clusters-template").html()),
    initialize: function () {
        this.listenTo(this.model, 'change:clusters', this.render);

        basicRadioChannel.on(basicRadioChannelEvents.radioEventClusterSizeChange, this.onClusterSizeChange, this);
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventClusterSizeChange, this.onClusterSizeChange, this);
    },
    onClusterSizeChange: function (clusters) {
        this.model.set('clusters', clusters);
    },
    events: {
        "click #btn-reset": "onBtnReset",
        "click #btn-add-to-cluster": "onBtnAddToCluster"
    },
    onBtnReset: function () {
        if (confirm('Are you sure you want to reset all?')) {
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventPageChange, "textbox");
        }
    },
    onBtnAddToCluster: function () {
        let selectedTokens = basicRadioChannel.request(basicRadioChannelEvents.radioEventEntityGetSelected);
        let clusterID = this.$el.find('#select-cluster').val();
        if (_.isEmpty(selectedTokens)) {
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventNotification, "Cluster cannot be empty!", "error");
        }
        else {
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventEntityAddToCluster, {
                clusterID: clusterID,
                selectedTokens: selectedTokens
            });
        }
    }
});

var HeaderView = View.extend({
    template: _.template($("#header-template").html()),
    activePage: "textbox",
    regions: {
        "content": ".header-inputs-wrapper"
    },
    initialize: function () {
        basicRadioChannel.on(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);
    },
    onPageChange: function (page) {
        this.activePage = page;
        this.render();
    },
    onRender() {
        let self = this;
        let element = this.regions['content'];
        switch (this.activePage) {
            case "textbox":
                self.showChildView('content', new HeaderLoadFileView({
                    'el': element,
                    model: self.model
                }).render());
                break;
            case "parsed":
                self.showChildView('content', new HeaderSaveClustersView({
                    'el': element,
                    model: self.model
                }).render());
                break;
            default:
                break;
        }
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);
    }
});

var ClusterView = View.extend({
    template: _.template($("#cluster-template").html()),
    events: {
        "click .btn-remove-cluster": "onBtnRemoveCluster",
        "click .btn-remove-cluster-item": "onBtnRemoveClusterItem"
    },
    initialize() {
        this.listenTo(this.model, 'change', this.render);
    },
    onBtnRemoveCluster: function () {
        /**
         * Remove chosen label from all tokens of cluster
         */
        _.each(this.model.get('tokens'), function (token) {
            token.set('isChosen', false);
        });
        this.model.collection.remove(this.model);
    },
    onBtnRemoveClusterItem: function (e) {
        let tokenNumber = parseInt($(e.currentTarget).data('token'));
        let token = this.model.get('tokens')[tokenNumber];
        this.model.get('tokens').splice(tokenNumber, 1);
        this.model.set('tokens', this.model.get('tokens'));
        token.set('isChosen', false);
        if (this.model.get('tokens').length == 0) {
            this.onBtnRemoveCluster();
        }
        else {
            this.render();
        }
    }
});

var SidebarEmptyView = View.extend({
    template: _.template($("#sidebar-empty-template").html())
});

var SidebarView = CollectionView.extend({
    template: _.template($("#sidebar-template").html()),
    childView: ClusterView,
    childViewContainer: "#clusters-wrapper",
    emptyView: SidebarEmptyView,
    initialize() {
        let self = this;
        basicRadioChannel.on(basicRadioChannelEvents.radioEventEntityAddToCluster, this.onEntityToClusterAdd, this);
        basicRadioChannel.on(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);

        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        this.listenTo(this.collection, 'reset', this.render);

        this.listenTo(this.collection, 'add', this.onCollectionSizeChange);
        this.listenTo(this.collection, 'remove', this.onCollectionSizeChange);
        this.listenTo(this.collection, 'reset', this.onCollectionSizeChange);
    },
    onCollectionSizeChange: function () {
        basicRadioChannel.trigger(basicRadioChannelEvents.radioEventClusterSizeChange, this.collection.toJSON());
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventEntityAddToCluster, this.onEntityToClusterAdd, this);
        basicRadioChannel.off(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);
    },
    onPageChange: function (page) {
        if (page == "textbox") {
            this.collection.reset();
        }
    },
    onEntityToClusterAdd: function (data) {
        let cluster = null;
        if (_.isEmpty(data.clusterID)) {
            let clusterCollectionLength = this.collection.length;
            cluster = this.collection.add({
                id: clusterCollectionLength,
                name: 'Cluster #' + clusterCollectionLength.toString(),
                tokens: []
            });
        }
        else {
            cluster = this.collection.at(data.clusterID);
        }
        data.selectedTokens.map(token => token.set({isChosen: true, isSelected: false}));
        cluster.set('tokens', cluster.get('tokens').concat(data.selectedTokens));
    }
});

var PageParsedTokenView = View.extend({
    template: _.template($("#page-parsed-token-template").html()),
    tagName: 'span',
    events: {
        "click .token-entity": "onTokenClick"
    },
    initialize: function () {
        this.listenTo(this.model, 'change', this.render);
    },
    onTokenClick: function (e) {
        if (!this.model.get('isChosen')) {
            this.model.set('isSelected', !this.model.get('isSelected'));
        }
    }
});

var PageParsedView = CollectionView.extend({
    template: _.template($("#page-parsed-template").html()),
    childView: PageParsedTokenView,
    childViewContainer: '.page-parsed-wrapper',
    initialize() {
        basicRadioChannel.on(basicRadioChannelEvents.radioEventEntitySelect, this.onEntitySelect, this);
        basicRadioChannel.on(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);
        basicRadioChannel.reply(basicRadioChannelEvents.radioEventEntityGetSelected, this.getSelectedEntities, this);

        /**
         * Listen to the change of the internal collection
         */
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        //this.listenTo(this.collection, 'change', this.render);
        this.listenTo(this.collection, 'update', this.render);
        this.listenTo(this.collection, 'reset', this.render);
    },
    onEntitySelect: function (number) {
        let entity = this.collection.at(number);
        entity.set('isSelected', !entity.get('isSelected'));
    },
    getSelectedEntities: function () {
        return this.collection.filter(token => token.get('isSelected'));
    },
    onPageChange: function () {
        this.collection.reset();
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventEntitySelect, this.onEntitySelect, this);
    }
});

var PageTextboxView = View.extend({
    template: _.template($("#page-textbox-template").html()),
    initialize() {
        basicRadioChannel.on(basicRadioChannelEvents.radioEventFileSelected, this.onFileSelectedEvent, this);
        basicRadioChannel.reply(basicRadioChannelEvents.radioEventFileGetText, this.getText, this);
    },
    onFileSelectedEvent: function (text) {
        this.model.set('fileText', text);
        this.render();
    },
    getText: function () {
        let text = this.$el.find("#file-text").val();
        this.model.set('fileText', text);
        return text;
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventFileSelected, this.onFileSelectedEvent, this);
    }
});

var PageView = View.extend({
    template: _.template($("#page-template").html()),
    activePage: 'textbox',
    activeData: [],
    regions: {
        "content": "#page-content"
    },
    initialize: function () {
        basicRadioChannel.on(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);
    },
    onPageChange: function (page, parsedData) {
        this.activePage = page;
        this.activeData = parsedData;
        this.render();
    },
    onRender() {
        let self = this;
        let element = this.regions['content'];
        switch (this.activePage) {
            case "textbox":
                self.showChildView('content', new PageTextboxView({
                    'el': element,
                    'model': new PageTextboxModel()
                }).render());
                break;
            case "parsed":
                self.showChildView('content', new PageParsedView({
                    'el': element,
                    'collection': new Backbone.Collection(self.activeData)
                }).render());
                break;
            default:
                break;
        }
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventPageChange, this.onPageChange, this);
    }
});

/**
 * Global layout of the application
 */
var AppLayout = View.extend({
    template: _.template($("#app-layout-template").html()),
    regions: {
        "header": "#header",
        "sidebar": "#sidebar",
        "page": "#page"
    },
    events: {},
    initialize: function () {
        basicRadioChannel.on(basicRadioChannelEvents.radioEventPreloaderShow, this.onPreloaderShow, this);
        basicRadioChannel.on(basicRadioChannelEvents.radioEventPreloaderHide, this.onPreloaderHide, this);
    },
    getPreloaderUIElement: function () {
        return this.$el.find("#preloader");
    },
    onPreloaderShow: function () {
        this.getPreloaderUIElement().addClass('visible');
    },
    onPreloaderHide: function () {
        this.getPreloaderUIElement().removeClass('visible');
    },
    onRender() {
        this.showChildView('header', new HeaderView({
            'el': this.regions['header'],
            'model': new NLPModel()
        }).render());
        this.showChildView('sidebar', new SidebarView({
            'el': this.regions['sidebar'],
            'collection': new Backbone.Collection()
        }).render());
        this.showChildView('page', new PageView({
            'el': this.regions['page'],
            model: new Model({activePage: 'default'}),
            activePage: "default"
        }).render());
    },
    onBeforeDestroy() {
        basicRadioChannel.off(basicRadioChannelEvents.radioEventPreloaderShow, this.onPreloaderShow, this);
        basicRadioChannel.off(basicRadioChannelEvents.radioEventPreloaderHide, this.onPreloaderHide, this);
    }
});

