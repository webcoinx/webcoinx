define(["jquery", "p2ptrade/comm", "p2ptrade/agent", "p2ptrade/offer", "p2ptrade/wallet"], function($,HTTPExchangeComm,ExchangePeerAgent,ExchangeOffer,MockWallet) {

var comm = null;
var epa = null;

var color1 = "1111";
var color2 = "2222";

function updateGUIstate () {
    var active = epa.hasActiveEP();
    var text = "";
    if (active) {
        text = "Transaction in progress: " + epa.active_ep.state;
        
    }

    $("#status").text(text);
}

function p2pgui(wm,cm) {
      comm = new HTTPExchangeComm('http://p2ptrade.btx.udoidio.info/messages');
      epa = new ExchangePeerAgent(new MockWallet(wm), comm);
      comm.addAgent(epa);
      window.setInterval(function () {
                             comm.update();
                             updateGUIstate();
                         }, 2000);

      $('#buy-button').click(
          function (event) {
              event.preventDefault();
              epa.registerMyOffer( 
                  new ExchangeOffer(null, {
                                          colorid: color1,
                                          value: 11
                                      }, {
                                          colorid: color2,
                                          value: 22
                                      }, true));
          });

      $('#sell-button').click(
          function () {
              event.preventDefault();
              epa.registerMyOffer( 
                  new ExchangeOffer(null, {
                                          colorid: color2,
                                          value: 22
                                      }, {
                                          colorid: color1,
                                          value: 11
                                      }, true));
          });
}      

console.log(p2pgui);
return p2pgui;      
              
});
