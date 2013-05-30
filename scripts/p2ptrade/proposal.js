define(["jquery","p2ptrade/offer"], function($,ExchangeOffer) {

     function make_random_id() {
         var text = "";
         var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

         for( var i=0; i < 10; i++ )
             text += possible.charAt(Math.floor(Math.random() * possible.length));
         return text;
     }



     function ExchangeProposal (wallet) {
         this.wallet = wallet;
     }
     ExchangeProposal.prototype.createNew = function (offer, etx, my_offer) {
         this.pid = make_random_id();
         this.offer = offer;
         this.etx = etx;
         this.my_offer = my_offer;
         this.state = 'proposed';
     };
     ExchangeProposal.prototype.getData = function () {
         return {
             pid: this.pid,
             offer: this.offer.getData(),
             tx: this.etx.getData()
         };
     };
     ExchangeProposal.prototype.importTheirs = function (data) {
         this.pid = data.pid;
         this.offer = new ExchangeOffer(data.offer);
         this.etx = this.wallet.importTx(data.tx);
         this.my_offer = null;
         this.state = 'imported';
     };
     ExchangeProposal.prototype.addMyTranche = function (p) {
         this.etx.appendTx(p);
     };
     ExchangeProposal.prototype.checkOutputsToMe = function (myaddress, color, value) {
         /*  Does their tranche have enough of the color
          that I want going to my address? */
         return this.etx.checkOutputsToMe(myaddress, color, value);
     };
     ExchangeProposal.prototype.signMyInputs = function (reftx) {
         return this.etx.signMyInputs(reftx);
     };
	 return ExchangeProposal;
});


