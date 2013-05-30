define(["jquery", "p2ptrade/offer", "p2ptrade/proposal"], function($, ExchangeOffer, ExchangeProposal) {
     function log_event(ekind, msg) {
         console.log("Event: " + ekind + " Msg:" + msg);
     }
     function now () {
         return Math.round((new Date()).getTime()/1000);
     }

     function  resolveColor(colorid) {
         //TODO: barf if colorid is not recognized
         return colorid;
     }

     function ExchangePeerAgent(wallet, comm) {
         this.my_offers = {};
         this.their_offers = {};
         this.wallet = wallet;
         this.active_ep = null;
         this.ep_timeout = null;
         this.comm = comm;
         this.match_offers = false;
         this.onCompleteTrade = function () {};
     };
     ExchangePeerAgent.prototype.setActiveEP = function (ep) {
         this.active_ep = ep;
         if (ep == null) {
             this.ep_timeout = null;
             this.match_orders = true;
         } else {
             this.ep_timeout = now() + this.comm.STANDARD_OFFER_EXPIRY_INTERVAL;
         }
         
     };
     ExchangePeerAgent.prototype.hasActiveEP = function () {
         if (this.ep_timeout && this.ep_timeout < now()) {
             this.setActiveEP(null); //TODO: cleanup?
             return false;
         } else 
             return this.active_ep != null;
     };
     ExchangePeerAgent.prototype.serviceMyOffers = function () {
         for (var oid in this.my_offers) {
             var offer = this.my_offers[oid];
             if (offer.auto_post) {
                 if (!offer.expired(+this.comm.STANDARD_OFFER_VALIDITY_INTERVAL)) continue;
                 if (this.active_ep) {
                     if (this.active_ep.offer.oid == offer.oid) continue;
                     if (this.active_ep.my_offer &&
                         this.active_ep.my_offer.oid == offer.oid) continue;
                 }
                 offer.refresh();
                 this.postMessage(offer);
             }       
         }
     };
     ExchangePeerAgent.prototype.serviceTheirOffers = function () {
         for (var oid in this.their_offers) {
             var offer = this.their_offers[oid];
             if (offer.expired(-this.comm.STANDARD_OFFER_VALIDITY_INTERVAL))
                 delete this.their_offers[oid];
         }       
     };
     ExchangePeerAgent.prototype.updateState = function () {
         if (this.match_offers) {
             this.match_offers = false;
             this.matchOffers();
         }
         this.serviceMyOffers();
         this.serviceTheirOffers();
     };
     ExchangePeerAgent.prototype.registerMyOffer = function (offer) {
         if (!offer.A.address)
             offer.A.address = this.wallet.getAddress(resolveColor(offer.A.colorid), false);
         this.my_offers[offer.oid] = offer;
         this.match_offers = true;
     };
     ExchangePeerAgent.prototype.registerTheirOffer = function (offer) {
         this.their_offers[offer.oid] = offer;
         offer.refresh();
         this.match_offers = true;
     };
     ExchangePeerAgent.prototype.cancelMyOffer = function (offer) {
         if (this.active_ep && ((this.active_ep.offer.oid == offer.oid)
                                || (this.active_ep.my_offer.oid == offer.oid)))
             this.setActiveEP(null);
         else
             if (this.my_offers[offer.oid])
                 delete this.my_offer[offer.oid];

     };
     ExchangePeerAgent.prototype.matchOffers = function () {
         log_event("ExchangePeerAgent.matchOffers");     
         if (this.hasActiveEP())
             return;
         for (var my_oid in this.my_offers) {
             var my_offer = this.my_offers[my_oid];
             for (var their_oid in this.their_offers) {
                 var their_offer = this.their_offers[their_oid];
                 if (my_offer.matches(their_offer)) {
                     var success = false;
                     try {
                         this.makeExchangeProposal(their_offer, my_offer.A.address, my_offer.A.value, my_offer);
                         success = true;
                     } catch (x) {
                         log_event("error", "error in makeExchangeProposal called from matchOffers");
                     }
                     if (success) return;
                 }
             }
         }
     };
     ExchangePeerAgent.prototype.makeExchangeProposal = function (orig_offer, my_address, my_value, related_offer) {
         log_event("ExchangePeerAgent.makeExchangeProposal");
         if (this.hasActiveEP()) 
             throw "already have active EP (in makeExchangeProposal)";
         var offer = new ExchangeOffer(orig_offer);
         if (my_value != offer.B.value)
             throw "partial fill isn't yet implemented";
         if (!my_address) {
             if (related_offer && related_offer.A.address)
                 my_address = related_offer.A.address;
             else
                 my_address = this.wallet.getSomeAddress();
         }
         offer.B.address = my_address;
         var acolor = resolveColor(offer.A.colorid);
         var bcolor = resolveColor(offer.B.colorid);
         var ep = new ExchangeProposal(this.wallet);
         ep.createNew(offer, 
                      this.wallet.createPayment(bcolor, my_value, offer.A.address),
                      related_offer);
         this.setActiveEP(ep);
         this.postMessage(ep);
     };
     ExchangePeerAgent.prototype.dispatchExchangeProposal = function (ep_data) {
         log_event("ExchangePeerAgent.dispatchExchangeProposal");
         var ep = new ExchangeProposal(this.wallet);
         ep.importTheirs(ep_data);
         if (this.hasActiveEP()) {
             if (ep.pid == this.active_ep.pid)
                 return this.updateExchangeProposal(ep);
         } else {
             if (this.my_offers[ep.offer.oid])
                 return this.acceptExchangeProposal(ep);
         }
        // We have neither an offer nor a proposal matching this ExchangeProposal
        if (this.their_offers[ep.offer.oid]) {
            // remove offer if it is in-work
            // TODO: set flag instead of deleting it
            delete this.their_offers[ep.offer.oid];
        }
        return null;
     };
     ExchangePeerAgent.prototype.acceptExchangeProposal = function (ep) {
         log_event("ExchangePeerAgent.acceptExchangeProposal", ep.pid);
         if (this.hasActiveEP()) return;
         var offer = ep.offer;
         var my_offer = this.my_offers[offer.oid];
         if (!offer.isSameAsMine(my_offer))
             throw "is invalid or incongruent with my offer (acceptExchangeProposal)";
         var acolor = resolveColor(offer.A.colorid);
         var bcolor = resolveColor(offer.B.colorid);
         if (!ep.checkOutputsToMe(offer.A.address, bcolor, offer.B.value))
             throw "Proposed tx does not pay enough coins of the color I want to me";
         var p = this.wallet.createPayment(acolor, offer.A.value, offer.B.address);
         ep.addMyTranche(p);
         ep.signMyInputs(p);
         this.setActiveEP(ep);
         ep.state = 'accepted';
         this.postMessage(ep);
     };
     ExchangePeerAgent.prototype.clearOrders = function (ep) {
         if (ep.state == 'proposed') {
             if (ep.my_offer) delete this.my_offers[ep.my_offer.oid];
             delete this.their_offers[ep.offer.oid];
         } else {
             delete this.my_offers[ep.offer.oid];
         }
     };
     ExchangePeerAgent.prototype.updateExchangeProposal = function (ep) {
         var my_ep = this.active_ep;
         if (!my_ep || my_ep.pid != ep.pid)
             throw "updateExchangeProposal: wrong state";
         var offer = my_ep.offer;
         var acolor = resolveColor(offer.A.colorid);
         var bcolor = resolveColor(offer.B.colorid);
         if (my_ep.state == 'proposed') {
             if (! ep.checkOutputsToMe(offer.B.address, acolor, offer.A.value))
                 throw "Proposed tx does not pay enough coins of the color I want to me";
             ep.signMyInputs(my_ep.etx);
         } else if (my_ep.state == 'accepted') {
             if (! ep.checkOutputsToMe(offer.A.address, bcolor, offer.B.value))
                 throw "Proposed tx does not pay enough coins of the color I want to me";
             // TODO: should we sign it again?
         } else throw "EP state is wrong in updateExchangeProposal";
         
         if (!ep.etx.hasEnoughSignatures())
             throw "Not all inputs are signed";
         ep.etx.broadcast();
         this.clearOrders(my_ep);
         //TODO: on complete
         this.setActiveEP(null);
         if (my_ep.state == 'proposed') 
             this.postMessage(ep);
     };
     ExchangePeerAgent.prototype.postMessage = function (obj) {
         log_event("ExchangePeerAgent.postMessage", JSON.stringify(obj.getData()));
         this.comm.postMessage(obj.getData());
     };
     ExchangePeerAgent.prototype.dispatchMessage = function (data) {
         log_event("ExchangePeerAgent.dispatchMessage", JSON.stringify(data));
         try {
             if (data.oid) {
                 var o = new ExchangeOffer(data);
                 this.registerTheirOffer(o);
             } else if (data.pid) {
                 this.dispatchExchangeProposal(data);
             }
         } catch (x) {
             log_event('error', "error in dispatchExchangeProposal: " + x.toString());
         }
     };
	 return ExchangePeerAgent;
});
