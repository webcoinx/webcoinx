define(["jquery"], function($) {
	function log_event(ekind, msg) {
		console.log("Event: " + ekind + " Msg:" + msg);
	}

     function make_random_id() {
         var text = "";
         var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

         for( var i=0; i < 10; i++ )
             text += possible.charAt(Math.floor(Math.random() * possible.length));
         return text;
     }


     function MockExchangeTransaction (wallet, data) {
         this.wallet = wallet;
         this.tx = data.tx;
         this.my = data.my;
     }
     MockExchangeTransaction.prototype.checkOutputsToMe = function (myaddress, color, value) {
         var total = 0;
         this.tx.out.forEach(function (out) {
                                 if (out.to == myaddress && out.color == color)
                                     total += out.value;
                                 });
         return (total >= value);
     };
     MockExchangeTransaction.prototype.signMyInputs = function (reftx) {
         var my = reftx ? reftx.my : this.my;
         this.tx.inp.forEach(function (inp) {
                                if (my.indexOf(inp.outpoint) >= 0)
                                    inp.signed = true;
                                 });
         return true;
     };
     MockExchangeTransaction.prototype.broadcast = function () {
         log_event("MockExchangeTransaction.broadcast");
         if (!this.hasEnoughSignatures())
             throw "trying to broadcast tx without enough signatures";
         return true;
     };
     MockExchangeTransaction.prototype.hasEnoughSignatures = function (){
         var ok = true;
         this.tx.inp.forEach(function (inp) {
                                if (!inp.signed) 
                                    ok = false;
                             });
         return ok;
     };
     MockExchangeTransaction.prototype.appendTx = function (etx) {
         // TODO: handle colors?
         this.tx.inp = this.tx.inp.concat(etx.tx.inp);
         this.tx.out = this.tx.out.concat(etx.tx.out);
         this.my = this.my.concat(etx.my);
     };
     MockExchangeTransaction.prototype.getData = function () {
         return this.tx;
     };
     
     function MockWallet (wm) {
		// here we go again :(
		var self = this;
		$(wm).bind('walletInit', function(e) {
			console.log('wallet creep');
        	self.wallet = e.newWallet.wallet;
			console.log(self.wallet);
		});
		 this.wm = wm;
         this.id = make_random_id();
     }
     MockWallet.prototype.getAddress = function (colorid, is_change) {
			 return 'a_' + this.wallet.getCurAddress().toString();
     };
     MockWallet.prototype.createPayment = function (color, amount, to_address) {
         var outpoint= "o_" + this.id + "_" + make_random_id();
         return new MockExchangeTransaction(this, 
                                            {
                                                tx: {inp: [{outpoint: outpoint, signed: false}],
                                                     out: [{to: to_address, value: amount, color: color}]},
                                                my: [outpoint]
                                            });
     };
     MockWallet.prototype.importTx = function (tx_data) {
         return new MockExchangeTransaction(this, 
                                            {
                                                tx: tx_data,
                                                my: []
                                            });
     };

	return MockWallet;
});
