define(function () {
  var ExitNode = function (host, port, secure, txDb, txMem, txView) {
	  this.setSocket(host, port, secure);

	  this.unique = 1;

	  this.callbacks = [];

	  this.txDb = txDb;
	  this.txMem = txMem;
	  this.txView = txView;
  };

  ExitNode.prototype.setSocket = function (host, port, secure) {
    this.uri = (secure ? "https://" : "http://")+host+":"+port;
  };

  ExitNode.prototype.connect = function (wallet) {
    console.log('connect');
	  this.wallet = wallet;

    // Workaround for socket.io not properly allowing disconnecting and reconnecting
    delete io.sockets[this.uri];
    io.j = [];
	  this.socket = io.connect(this.uri,{'connect timeout': 1000});
	  this.socket.on('connect', $.proxy(this.handleConnect, this));
	  this.socket.on('error', function (error) {
		  console.log('socketio error:\n\t ' + error);
	  });
	  this.socket.on('message', $.proxy(this.handleMessage, this));
	  this.socket.on('disconnect', $.proxy(this.handleDisconnect, this));
  };

  ExitNode.prototype.disconnect = function () {
	  if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

	  var connectStatusEvent = jQuery.Event('connectStatus');
	  connectStatusEvent.status = 'unknown';
	  $(this).trigger(connectStatusEvent);
  };

  /**
   * Make RPC call.
   */
  ExitNode.prototype.call = function (method, argObj, callback) {
	  this.socket.send($.toJSON({
		  "method": method,
		  "params": [argObj],
		  "id": this.unique
	  }));
	  if (callback) this.callbacks[this.unique] = callback;
	  this.unique++;
  };

  ExitNode.prototype.handleConnect = function () {
	  var self = this;

	  self.call("pubkeysRegister", {
		  keys: this.wallet.getAllAddresses().join(',')
	  }, function (err, result) {
		  if (err) {
			  console.error("Could not register public keys");
			  return;
		  }

		  self.call("pubkeysListen", {
			  handle: result.handle
		  }, function (err, result) {
			  // Communicate the block height
			  var blockInitEvent = jQuery.Event('blockInit');
			  blockInitEvent.height = result.height;
			  $(self).trigger(blockInitEvent);

			  // Pass on the newly downloaded transactions
			  var txDataEvent = jQuery.Event('txData');
			  txDataEvent.confirmed = true;
			  txDataEvent.txs = result.txs;
			  $(self).trigger(txDataEvent);

			  // TODO: Download more transactions

			  var connectStatusEvent = jQuery.Event('connectStatus');
			  connectStatusEvent.status = 'ok';
			  $(self).trigger(connectStatusEvent);
		  });

		  self.call("pubkeysUnconfirmed", {
			  handle: result.handle
		  }, function (err, result) {
			  // Pass on the newly downloaded transactions
			  var txDataEvent = jQuery.Event('txData');
			  txDataEvent.confirmed = false;
			  txDataEvent.txs = result.txs;
			  $(self).trigger(txDataEvent);
		  });
	  });
  };


  ExitNode.prototype.handleMessage = function (data) {
	  // Handle JSON-RPC result messages
	  if ("undefined" !== typeof data.result &&
		    "function" == typeof this.callbacks[data.id]) {
		  this.callbacks[data.id](data.error, data.result);

	    // Handle JSON-RPC request messages
	  } else if ("undefined" !== typeof data.method) {
		  // Create an event object
		  var event = jQuery.Event(data.method);

		  // Copy the fields from the parameter object
		  $.extend(event, data.params[0]);

		  // Send off the event
		  $(this).trigger(event);
	  }
  };


  ExitNode.prototype.handleDisconnect = function () {
	  // TODO: Attempt reconnect (unless disconnect was intended)
  };

  return ExitNode;
});
