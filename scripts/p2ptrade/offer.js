define(["jquery"], function($) {
     function log_event(ekind, msg) {
         console.log("Event: " + ekind + " Msg:" + msg);
     }
     function now () {
         return Math.round((new Date()).getTime()/1000);
     }

     var STANDARD_OFFER_EXPIRY_INTERVAL = 60;

     function make_random_id() {
         var text = "";
         var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

         for( var i=0; i < 10; i++ )
             text += possible.charAt(Math.floor(Math.random() * possible.length));
         return text;
     }


     function ExchangeOffer(oid, A, B, auto_post) {
         // A = offerer's side, B = replyer's side
         // ie. offerer says "I want to give you A['value'] coins of color 
         // A['colorid'] and receive B['value'] coins of color B['colorid']"

         if (oid == null) {
             if (!A) 
                 return; //empty object
             oid = make_random_id();
         } else if (typeof oid == 'object') {
             A = $.extend(true, {}, oid.A);
             B = $.extend(true, {}, oid.B);
             oid = oid.oid;
         }
         this.oid = oid;
         this.A = A;
         this.B = B;
         this.expires = null;
         this.auto_post = auto_post;
     }
     ExchangeOffer.prototype.getData = function () {
         return {
             oid: this.oid,
             A: this.A,
             B: this.B
         };
     };
     ExchangeOffer.prototype.expired = function (shift) {
         return !this.expires 
             || (this.expires < now() + (shift || 0));
     };
     ExchangeOffer.prototype.refresh = function (delta) {
         this.expires = now() + (delta || STANDARD_OFFER_EXPIRY_INTERVAL);
     };
     ExchangeOffer.prototype.matches = function (offer) {
         // cross match A -> B, B -> A.
         var self = this;
         function prop_matches(name) {
             return (self.A[name] == offer.B[name]) && (self.B[name] == offer.A[name]);
         }
         return prop_matches('value') && prop_matches('colorid');
     };
     ExchangeOffer.prototype.isSameAsMine = function (my_offer) {
         if (my_offer.A.address && my_offer.A.address != this.A.address)
             return false;
         if (my_offer.B.address && my_offer.B.address != this.B.address)
             return false;
         var self = this;
         function checkprop (name) {
             if (self.A[name] != my_offer.A[name]) return false;
             if (self.B[name] != my_offer.B[name]) return false;
             return true;
         }
         if (!checkprop('colorid')) return false;
         if (!checkprop('value')) return false;
         return true;
     };
	 return ExchangeOffer;
});
