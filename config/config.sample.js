//
// bitcoinjs-gui server configuration defaults
//
// These settings are used as the defaults for all users connecting to
// this version of the client.
//
// If you don't wish to change a setting, it is recommended that you
// leave it commented out, so the global default will apply, which may
// be updated/improved in the future.
//

Settings.defaultSettings = {
	//
	// Default fee
	//
	// Normally you should not set this here, as future versions of
	// bitcoinjs-gui will like adapt this setting as the network
	// properties change.
	//
	//fee: "0.0005",

	// 0 = main, 0x6f = test3
	addrType: 0x6f,

	//
	// Hostname of the default exit node
	//
	// Defaults to location.host
	//
	//exitNodeHost: "exit.webcoin.ch",

	//
	// Port of the default exit node
	//
	// The default port for BitcoinJS exit nodes is 3125.
	//
	//exitNodePort: 3125,
	colordefServers: " devel.hz.udoidio.info:8080"

	//
	// Whether the exit node uses HTTPS/SSL
	//
	// Defaults to false
	//
	//exitNodeSecure: false
};
