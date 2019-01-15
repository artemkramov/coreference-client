const { Application } = Marionette;

const notificationModel = new NotificationModel();

/**
 * Application object
 */
const App = Application.extend({
    region: "body",
    onStart() {
    /**
     * Prepare layout to form the page
     * @type {AppLayout}
     */
    var appLayout = new AppLayout({ el: 'body' });
    var self = this;

    /**
     * Render the layout
     */
    self.showView(appLayout.render());
}
});

const app = new App();
app.start();