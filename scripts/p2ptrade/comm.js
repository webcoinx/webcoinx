define(["jquery"], function($) {
     function HTTPExchangeComm (url) {
         this.agents = [];
         this.lastpoll = -1;
         this.url = url || 'http://localhost:8090/messages';
         this.own_msgids = {};
     }
     function log_event(ekind, msg) {
         console.log("Event: " + ekind + " Msg:" + msg);
     }
     function now () {
         return Math.round((new Date()).getTime()/1000);
     }
     function make_random_id() {
         var text = "";
         var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

         for( var i=0; i < 10; i++ )
             text += possible.charAt(Math.floor(Math.random() * possible.length));
         return text;
     }


     HTTPExchangeComm.prototype.STANDARD_OFFER_EXPIRY_INTERVAL = 60;
	HTTPExchangeComm.prototype.STANDARD_OFFER_VALIDITY_INTERVAL = 15;



     HTTPExchangeComm.prototype.addAgent = function (agent) {
         this.agents.push(agent);
     };
     HTTPExchangeComm.prototype.postMessage = function (content) {
         var msgid = make_random_id();
         content.msgid = msgid;
         this.own_msgids[msgid] = 1;
         var str = JSON.stringify(content);
         $.ajax({
                    data: str,
                    url: this.url,
                    type: 'POST'
                    //TODO: handle error
                });
     };
     HTTPExchangeComm.prototype.pollAndDispatch = function (cont) {
         var data;
         var self = this;
         if (this.lastpoll == -1)
             data = {from_timestamp: (now() - this.STANDARD_OFFER_EXPIRY_INTERVAL).toString()};
         else
             data = {from_serial: (this.lastpoll + 1).toString()};
         $.ajax({
                    url: this.url,
                    data: data,
                    dataType: 'json',
                    success: function (resp) {
                        log_event("HTTPExchangeComm.pollAndDispatch", "got " + resp.length + " objects");
                        resp.forEach(function (x) {
                                         if (x.serial && x.serial > self.lastpoll)
                                             self.lastpoll = x.serial;
                                         var content = x.content;
                                         if (content && !self.own_msgids[content.msgid])
                                             self.agents.forEach(function (a) {
                                                                     a.dispatchMessage(content);
                                                                 });
                                     });
                        cont();
                        
                    }
                    //TODO: error
                });



     };
     HTTPExchangeComm.prototype.update = function (cont) {
         var agents = this.agents;
         this.pollAndDispatch(function () {
                                  agents.forEach(function (a) {
                                                     a.updateState(); 
                                                 });
                                  if (cont) 
                                      cont();
                              });
     };
	return HTTPExchangeComm;     
});
