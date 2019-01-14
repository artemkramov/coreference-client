const { View, CollectionView, Region } = Marionette;

var HeaderView = View.extend({
    template: _.template($("#header-template").html()),
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
        reader.onload = function(e) {
            let contents = e.target.result;
            basicRadioChannel.trigger(basicRadioChannelEvents.radioEventFileSelected, contents);
        };
        reader.readAsText(file);
        return false;
    },
    onBtnRecognize: function () {
        let text = basicRadioChannel.request(basicRadioChannelEvents.radioEventFileGetText);
        console.log(text);
    }
});

var SidebarView = View.extend({
    template: _.template($("#sidebar-template").html())
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
    }
});

var PageView = View.extend({
    template: _.template($("#page-template").html()),
    activePage: 'textbox',
    regions: {
        "content": "#page-content"
    },
    onRender() {
        let self = this;
        let element = this.regions['content'];
        switch (this.activePage) {
            case "textbox":
                self.showChildView('content', new PageTextboxView({
                    'el': element,
                    'model': pageTextboxModel
                }).render());
                break;
            default:
                break;
        }

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
    },
    onRender() {
        this.showChildView('header', new HeaderView({'el': this.regions['header']}).render());
        this.showChildView('sidebar', new SidebarView({'el': this.regions['sidebar']}).render());
        this.showChildView('page', new PageView({
            'el': this.regions['page'],
            model: new Model({activePage: 'default'}),
            activePage: "default"
        }).render());
    }
});

