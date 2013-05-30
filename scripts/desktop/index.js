define([
  "jquery",
  "../walletmanager",
  "../exitnode",
  "./txview",
  "../bindings",
  "../colorman",
  "../p2ptrade/gui",
  "../wallets/miniwallet"
], function ($, WalletManager, ExitNode, TransactionView, setCommonBindings, ColorMan, p2pgui) {

$(function () {
  $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'stylesheets/desktop.css') );

  var html = new EJS({url: 'views/layout.ejs'}).render();
  $("body").html(html);

	// CSS tweaks
	$('#header #nav li:last').addClass('nobg');
	$('.block_head ul').each(function() { $('li:first', this).addClass('nobg'); });
	$('button')
		.button()
		.filter('#nav_send_money')
			.button('option', 'icons', {primary: "icon-bitcoin-send"})
			.end()
	;

	// Messages
	$('.block .message').hide().append('<span class="close" title="Dismiss"></span>').fadeIn('slow');
	$('.block .message .close').hover(
		function() { $(this).addClass('hover'); },
		function() { $(this).removeClass('hover'); }
	);
	$('.block .message .close').click(function (e) {
		$(this).parent().fadeOut('slow', function() { $(this).remove(); });
	});

	// Address auto-selection
	$('#addr').focus(function (e) {
		this.select();
	}).mouseup(function (e) {
		this.select();
		e.preventDefault();
	});

	// Address copy-to-clipboard
	ZeroClipboard.setMoviePath('scripts/vendor/zeroclipboard/ZeroClipboard.swf');
	var addrClip = new ZeroClipboard.Client();
	//addrClip.glue('addr_clip', 'wallet_active');
	var addrClipButton = $('#addr_clip');
	addrClip.addEventListener( 'mouseOver', function(client) {
		addrClipButton.addClass('ui-state-hover');
	});

	addrClip.addEventListener( 'mouseOut', function(client) {
		addrClipButton.removeClass('ui-state-hover');
	});

	addrClip.addEventListener( 'mouseDown', function(client) {
		addrClipButton.addClass('ui-state-focus');
	});

	addrClip.addEventListener( 'mouseUp', function(client) {
		addrClipButton.removeClass('ui-state-focus');
	});

	// Options for autoNumeric to render BTC amounts
	var autoNumericBtc = {
		aSign: "BTC ",
		mDec: 8,
		aPad: 2
	};

        var autoNumericColor = {
		vMin: '0',
		mDec: null,
        };

	var cfg = new Settings();
	var wallet;
	var wm = new WalletManager();
	var txDb = new TransactionDatabase(); // Tx chain
	var txMem = new TransactionDatabase(); // Memory pool

	// Once wallet is loaded, we can connect to the exit node
    var allowedColors = cfg.get('allowedColors') || {};
	var exitNodeHost = cfg.get('exitNodeHost');
	var exitNodePort = cfg.get('exitNodePort');
	var exitNodeSecure = cfg.get('exitNodeSecure');
	var exitNode = new ExitNode(exitNodeHost, +exitNodePort, !!exitNodeSecure,
                              txDb, txMem, txView);
	var colordefServers = cfg.get('colordefServers');
    var colorMan = new ColorMan(exitNode);
	var txView = new TransactionView($('#main_tx_list'), colorMan);
	var pgui = new p2pgui(wm,colorMan);

  $('#exitnode_status').text(exitNodeHost);

  setCommonBindings(cfg, wm, txDb, txMem, txView, exitNode, colorMan);

	$(exitNode).bind('connectStatus', function (e) {
		console.log('connect', e);
		$('#exitnode_status').removeClass('unknown error warning ok');
		$('#exitnode_status').addClass(e.status);
	});

  $(exitNode).bind('txData txAdd txNotify', function (e) {
		  updateBalance();
  });

	$(wm).bind('walletProgress', function (e) {
		$("#wallet_init_status").text("Creating wallet "+e.n+"/"+e.total);
	});

	$(wm).bind('walletInit', function (e) {
		$("#wallet_init_status").text("");
		$('#wallet_active').show();
		$('#wallet_init').hide();
        wallet= e.newWallet.wallet;
		var addr = e.newWallet.wallet.getCurAddress().toString();
		$('#addr').val(addr);
		addrClip.setText(addr);
		addrClip.reposition();
	});

	$(wm).bind('walletDeinit', function (e) {
		$("#wallet_init_status").text("");
		$('#wallet_active').hide();
		$('#wallet_init').show();
	});

	// Load wallet if there is one
	wm.init();

	// Interface buttons
	$('#wallet_init_create').click(function (e) {
		e.preventDefault();
		wm.createWallet({
            'type': 'mini',
            'name': 'testing'
        });
	});
	$('#wallet_active_recreate').click(function (e) {
		e.preventDefault();
		if (prompt("WARNING: This action will make the application forget your current wallet. Unless you have the wallet backed up, this is final and means your balance will be lost forever!\n\nIF YOU ARE SURE, TYPE \"YES\".") === "YES") {
            wm.createWallet({
                'type': 'mini',
                'name': 'testing'
            });
		}
	});

	$('#wallet_active .new_addr').click(function (e) {
		e.preventDefault();
		var addr = mangle_addr(wallet.getNextAddress().toString());
		$('#addr').val(addr);
		addrClip.setText(addr);
		addrClip.reposition();
		wm.save();
	});

        function getColor() {
             return $('#color_selector option:selected').val();
        }
        function getColorName() {
             return $('#color_selector option:selected').text();
        }

    function mangle_addr(addr) {
		var color = getColor(); // '' = BTC
        return color!=''?(color+'@'+addr):addr;
    }

	function updateBalance() {
		var color = getColor(); // '' = BTC
		v = Bitcoin.Util.formatValue(colorMan.s2c(color, wallet.getBalance(color)));
                if (color) {
                	// btc2color prevents rounding errors
			v = colorMan.btc2color(v,color);
//                	autoNumericColor.aSign = getColorName() + ' ';
//			autoNumericColor.vMax = ''+v;
			console.log(autoNumericColor);
		}
		$('#wallet_active .balance .value').text(v);
        $('#colorind').text(getColorName());
 		var addr = wallet.getCurAddress().toString();
		$('#addr').val(mangle_addr(wallet.getCurAddress().toString()));
	}

	$('#color_selector').change(function() {
		updateBalance();
	});

	$(wm).bind('walletUpdate', function() {
		updateBalance();
	});

	$(colorMan).bind('colordefUpdate', function(e,d) {
		var sel = $('#color_selector');
		sel.empty();
		sel.append('<option value="">BTC</option>');
        var first = $.isEmptyObject(allowedColors);
        console.log('first='+first);
        console.log(d);

        console.log(allowedColors);

        function isgood(c) {
            if (!first) {
                if (allowedColors[c] != true) return false;
            } else {
                allowedColors[c] = true;
            }
            return true;
        }

        var cms = $('#color_multiselect');
        cms.empty();

        var g = null;
		$(d).each(function() {
            // flush optgroup
            if (g && g.label != this.server)
                g = null;

            // new optgroup
            if (!g) {
                g = document.createElement('optgroup');
                g.label = this.server;
                cms.append(g);
            }


            // append option to current optgroup
            g.appendChild(new Option(this.name, this.colorid, false, isgood(this.colorid)));

            // dont proceed unless selected
            if (!isgood(this.colorid)) return;

			sel.append($('<option></option>')
				.attr('value', this.colorid)
				.text(this.name))
		});
        cms.multiselect('refresh');
	});


	// Send Money Dialog
	var sendDialog = $('#dialog_send_money').dialog({
		autoOpen: false,
		minWidth: 550,
		resizable: false
	});

	var issueDialog = $('#dialog_issue_money').dialog({
		autoOpen: false,
		minWidth: 550,
		resizable: false
	});

	$('#nav_issue_money').click(function (e) {
		e.preventDefault();	
		//var an = getColor()?autoNumericColor:autoNumericBtc;
		//sendDialog.find('.amount').autoNumeric(an);
		issueDialog.dialog('open');
		issueDialog.find('.entry').show();
		issueDialog.find('.confirm, .loading').hide();
		issueDialog.find('.dialog_issue_name').focus();
		issueDialog.find('#dialog_issue_unit').val('10000');
		issueDialog.find('.messages').empty();
	});
	issueDialog.find('.cancel').click(function (e) {
		e.preventDefault();
		issueDialog.dialog('close');
	});
	issueDialog.find('.cancel_confirm').click(function (e) {
		e.preventDefault();
		issueDialog.find('.entry').show();
		issueDialog.find('.confirm, .loading').hide();
	});
	issueDialog.find('.issue').click(function (e) {
		e.preventDefault();
		var msgHub = issueDialog.find('.messages');
		msgHub.empty();

		function validateError(msg) {
			var msgObj = Message.create(msg, "error");
			msgObj.appendTo(msgHub);
		}


		var name = issueDialog.find('#dialog_issue_name').val();
		name = name.replace(/^\s+/, "").replace(/\s+$/, "");

		if (!name.length) {
			validateError("Please enter name of issued asset.");
			return;
		}

		// Safe conversion from double to BigInteger
		var amount_s = ""+$.fn.autoNumeric.Strip("dialog_issue_amount");
		if (!amount_s) {
			validateError("Please enter an amount.");
			return;
		}

		var amount = Bitcoin.Util.parseValue(amount_s,1);

		if (amount.compareTo(BigInteger.ZERO) <= 0) {
			validateError("Please enter a positive amount of " + name);
			return;
		}


		var unit_s = ""+$.fn.autoNumeric.Strip("dialog_issue_unit");
		if (!unit_s) {
			validateError("Please enter an unit size in satoshi.");
			return;
		}

		var unit = Bitcoin.Util.parseValue(unit_s,1);

		if (unit.compareTo(BigInteger.ZERO) <= 0) {
			validateError("Please enter a positive amount of satoshi per unit");
			return;
		}

        var cost = amount.multiply(unit);
		if (cost.compareTo(wallet.getBalance()) > 0) {
			validateError("You have insufficient BTC for this issue.");
			return;
		}

        var cost_s = Bitcoin.Util.formatValue(cost);
		issueDialog.find('.confirm_issue_amount').text(amount_s);
		issueDialog.find('.confirm_issue_name').text(name);
		issueDialog.find('.confirm_issue_cost').text(cost_s);

		issueDialog.find('.confirm').show();
		issueDialog.find('.entry, .loading').hide();

		var confirmButton = issueDialog.find('.confirm_issue');
		confirmButton.unbind('click');
		confirmButton.click(function () {
			try {
			var tx = wallet.createSend(wallet.getCurAddress(), cost, Bitcoin.Util.parseValue(''+cfg.get('fee')), false);
			} catch (e) {
				alert(e.message);
				return;
			}
			wm.save(); // dont forget change addresses
			var txBase64 = Crypto.util.bytesToBase64(tx.serialize());

			issueDialog.find('.loading').show();
			issueDialog.find('.entry, .confirm').hide();

			issueDialog.find('.loading p').text("Issuing coins...");

            // issue color, send transaction
            colorMan.issue(colordefServers, name, unit_s, Crypto.util.bytesToHex(tx.getHash().reverse()), function(colorid,stat,xhr) {
                        if (!colorid || colorid.length != 40) {
                            validateError("Remote error while processing issuing transaction, cancelled");
                            return;
                        }

                    allowedColors[colorid] = true;
                    cfg.apply({allwedColors: allowedColors});
        			var txHash = Crypto.util.bytesToBase64(tx.getHash());
                    $(exitNode).bind('txNotify', function (e) {
                        if (e.tx.hash == txHash) {
                            // Our transaction
                            issueDialog.dialog('close');
                            $(exitNode).unbind('txNotify', arguments.callee);
                            setTimeout(reload_colors, 1000);
                        }
                    });

                     exitNode.call("txSend", {tx: txBase64}, function (err) {
                        if (err) {
                            validateError("Error while processing issuing transaction: " +
                                                data.error.message);
                            return;
                        }
                        issueDialog.find('.loading p').text("Awaiting reply...");
                    });
            });
		});
	});



	$('#nav_send_money').click(function (e) {
		e.preventDefault();	
		//var an = getColor()?autoNumericColor:autoNumericBtc;
		//sendDialog.find('.amount').autoNumeric(an);
		sendDialog.dialog('open');
		sendDialog.find('.entry').show();
		sendDialog.find('.confirm, .loading').hide();
		sendDialog.find('.amount').focus();
		sendDialog.find('.address').val('');
		sendDialog.find('.messages').empty();
	});
	sendDialog.find('.cancel').click(function (e) {
		e.preventDefault();
		sendDialog.dialog('close');
	});
	sendDialog.find('.cancel_confirm').click(function (e) {
		e.preventDefault();
		sendDialog.find('.entry').show();
		sendDialog.find('.confirm, .loading').hide();
	});
	sendDialog.find('.send').click(function (e) {
		e.preventDefault();
		var msgHub = sendDialog.find('.messages');
		msgHub.empty();

		function validateError(msg) {
			var msgObj = Message.create(msg, "error");
			msgObj.appendTo(msgHub);
		}

		// Safe conversion from double to BigInteger
		var valueString = ""+$.fn.autoNumeric.Strip("dialog_send_money_amount");
		if (!valueString) {
			validateError("Please enter an amount.");
			return;
		}

		var value = Bitcoin.Util.parseValue(valueString, getColor());


		if (value.compareTo(BigInteger.ZERO) <= 0) {
			validateError("Please enter a positive amount of " + (getColorName()));
			return;
		}

		var rcpt = sendDialog.find('.address').val();

		// Trim address
		rcpt = rcpt.replace(/^\s+/, "").replace(/\s+$/, "");
        if (!rcpt) {
			validateError("Enter address");
            return;
        }
        var cid = getColor();
         if (cid) {
            if (rcpt.indexOf(cid + '@') != 0) {
                validateError("Please use correct color address to prevent accidents");
                return;
            }
            // sha256 + @
            rcpt = rcpt.slice(41);
            cid = colorMan.cmap(cid);
            console.log('@@CID2');
            console.log(cid);
            value = value.multiply(Bitcoin.Util.parseValue(cid.unit,1));
        }


		if (value.compareTo(wallet.getBalance(getColor())) > 0) {
			validateError("You have insufficient funds for this transaction.");
			return;
		}


		if (!rcpt.length) {
			validateError("Please enter the Bitcoin address of the recipient.");
			return;
		}

		try {
			var pubKeyHash = Bitcoin.Address.decodeString(rcpt);
		} catch (e) {
			validateError("Bitcoin address invalid, please double-check.");
			return;
		}

		sendDialog.find('.confirm_amount').text(valueString + ' ' + getColorName());
		sendDialog.find('.confirm_address').text(rcpt);

		sendDialog.find('.confirm').show();
		sendDialog.find('.entry, .loading').hide();

		var confirmButton = sendDialog.find('.confirm_send');
		confirmButton.unbind('click');
		confirmButton.click(function () {
			try {
			var tx = wallet.createSend(new Bitcoin.Address(rcpt), value, Bitcoin.Util.parseValue(''+cfg.get('fee')), getColor());
			} catch (e) {
				alert(e.message);
				return;
			}
			wm.save(); // dont forget change addresses
			var txBase64 = Crypto.util.bytesToBase64(tx.serialize());

			sendDialog.find('.loading').show();
			sendDialog.find('.entry, .confirm').hide();

			sendDialog.find('.loading p').text("Sending coins...");

			var txHash = Crypto.util.bytesToBase64(tx.getHash());
			$(exitNode).bind('txNotify', function (e) {
				if (e.tx.hash == txHash) {
					// Our transaction
					sendDialog.dialog('close');
					$(exitNode).unbind('txNotify', arguments.callee);
				}
			});

      exitNode.call("txSend", {tx: txBase64}, function (err) {
				if (err) {
					validateError("Error sending transaction: " +
								        data.error.message);
					return;
				}
				sendDialog.find('.loading p').text("Awaiting reply...");
			});
		});
	});

	// Transaction Viewer Dialog
	var al = $('#address_load').dialog({ autoOpen: false, minWidth: 500 });
	$('#address_load_open, #address_load_reset').click(function () {
		al.find('.progress, .result').hide();
		al.find('.query').show();
		$('#address_load').dialog('open');
	});

	$('#address_load_start').click(function () {
		al.find('.query, .result').hide();
		al.find('.progress').show().text('Loading transactions...');
		var addresses = $('#addresses').val().split("\n").join(",");
		$.get('/pubkeys/register', {keys: addresses}, function (data) {
			if (data.error) {
				// TODO: handle
				return;
			}
			$.get('/pubkeys/gettxs', {handle: data.handle}, function (data) {
				if (data.error) {
					// TODO: handle
					return;
				}
				var hashes = [];
				for (var i = 0; i < data.txs.length; i++) {
					hashes.push(data.txs[i].hash);
				}
				al.find('.query, .progress').hide();
				var transactionDb = new TransactionDatabase();
				var transactionView = new TransactionView(al.find('.result').show().find('.txs'));
				transactionView.setDatabase(transactionDb);
			    transactionDb.loadTransactions(data.txs);
			}, 'json');
		});
	});

	// Settings Dialog
	var cfgd = $('#dialog_settings');
    $('#color_multiselect').multiselect().on('multiselectChange', function(evt, ui) {
        for (var i = 0; i < ui.optionElements.length; i++) {
            var c = ui.optionElements[i];
            allowedColors[c.value] = ui.selected;
            $('#colorUrl').val(c.parentElement.label);
        }
    });
	cfgd.bind('dialogopen', function (e) {
		// Populate fee field
		var fee = $.fn.autoNumeric.Format('dialog_settings_fee', cfg.get('fee'), autoNumericBtc);
		cfgd.find('#dialog_settings_fee').val(fee);

		// Populate exit node fields
		cfgd.find('#dialog_settings_exitNodeHost').val(cfg.get('exitNodeHost'));

//        reload_colors();
//		cfgd.find('#dialog_settings_colordefServers').val(cfg.get('colordefServers'));
	});

    // UGLY UGLY UGLY UGLY
    function reload_colors() {
        colorMan.reloadColors(colordefServers, function() { // triggers colordefUpdate above
            colorMan.update(wm, function() {
                $(wm).trigger('walletUpdate');
            });
        });
    }

    cfgd.find('#addColorUrl').click(function(e) {
        var url = cfgd.find('#colorUrl').val();
        if (colordefServers.indexOf(url) != -1) return;
        colordefServers = colordefServers + ' ' + url;
        cfgd.find('#colorUrl').val('');
        reload_colors();
        return false;
    });

    cfgd.find('#delColorUrl').click(function(e) {
        colordefServers = colordefServers.replace(' ' + cfgd.find('#colorUrl').val(), '');
        cfgd.find('#colorUrl').val('');
        reload_colors();
        return false;
    });

	cfgd.find('.controls .save').click(function (e) {
		cfgd.dialog('close');

		var newSettings = {};

		newSettings.fee = +$.fn.autoNumeric.Strip("dialog_settings_fee");
		newSettings.exitNodeHost = cfgd.find('#dialog_settings_exitNodeHost').val();
        newSettings.allowedColors = allowedColors;
		newSettings.colordefServers = colordefServers;

		cfg.apply(newSettings);
        location.reload();
        return false;
	});
	cfgd.find('.controls .cancel').click(function (e) {
		cfgd.dialog('close');
		return false;
	});
	cfgd.dialog({
		dialogClass: "block withsidebar",
		autoOpen: false,
		minWidth: 600,
        minHeight: 488,
		resizable: false
	});
	$(".sidebar_content").hide();
	$("ul.sidemenu li:first-child").addClass("active").show();
	$(".block .sidebar_content:first").show();
	$("ul.sidemenu li").click(function() {
		var activeTab = $(this).find("a").attr("href");
		$(this).parent().find('li').removeClass("active");
		$(this).addClass("active");
		$(this).parents('.block').find(".sidebar_content").hide();
		$(activeTab).show();
		return false;
	});
	$('#nav .settings').click(function () {
		cfgd.dialog('open');
		return false;
	});

	/*
	// Some testing code:
	//$('#addr').text(Bitcoin.Base58.encode(Crypto.util.hexToBytes("0090fd25b15e497f5d0986bda9f7f98c1f8c8a73f6")));
	var key = new Bitcoin.ECKey();
	key.pub = Crypto.util.hexToBytes("046a76e56adf269cb896a7af1cdb01aa4acce82881a2696bc33a04aed20c176a44ed7bfbb10b91186f1a6b680daf000f742213bb3033b56c73695f357afc768781");
	console.log(key.getBitcoinAddress().toString());

	var addr = new Bitcoin.Address('1EDdZbvAJcxoHxJq6UDQGDtEQqgoT3XK3f');
	console.log(Crypto.util.bytesToHex(addr.hash));
	console.log(addr.toString());*/
});


});
