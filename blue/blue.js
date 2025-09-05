import {Bluez} from '@tanislav000/bluez';
import WebSocket, { WebSocketServer } from 'ws';

export default class Bluetool {

	constructor () {
		this.bluetooth = new Bluez();
		this.ws = new WebSocketServer({port:6689});
		this.ws.on('connection', (sc) => {
			this.sc = sc;
			sc.on('error', console.error);
			sc.on('message', (data) => {
				console.log(data);
				console.log('blue received: %s', data);
				if (data.toString().startsWith('{')) {
					const prms = JSON.parse(data);
					this._performAct(prms.mac, prms.act);
				}
			});
			sc.send('Discovering devices...<br>');
			this._scanBlue();
		});
		//this.#playSocket();
		console.log('Starting bluetooth tool');
		//this._scanBlue();
	}

	async _performAct (addr, act) {
		const adapter = await this.bluetooth.getAdapter();
		adapter.StopDiscovery();
		if (act=='xxx') return;
		let dev = await adapter.getDevice(addr);
		switch (act) {
			case 'cnct':
				dev.Connect();
				break;
			case 'dscn':
				dev.Disconnect();
				break;
			case 'pair':
				dev.Pair();
				break;
			case 'trst':
				dev.Trusted(true);
				break;
			case 'rmov':
				adapter.RemoveDevice(dev);
				break;
		}
	}

	_scanBlue () {
		this.bluetooth.init().then(async () => {
			// listen on first bluetooth adapter
			const adapter = await this.bluetooth.getAdapter();
			console.log('AD',await adapter.Discovering());
			if (await adapter.Discovering()) await adapter.StopDiscovery();

			const devs = await adapter.listDevices();
			for (let [key, value] of Object.entries(devs)) {
				if (value.Name) {
					//value.Address += '$';
					this._showDevice(value);
				}
			}

			adapter.on('DeviceAdded', (address, props) => {
				if (props.Name) this._showDevice(props);
			});

			await adapter.StartDiscovery();
			console.log("Discovering");
		}).catch(console.error);
	}

	_showDevice (dev) {
		const addr = dev.Address;
		const paired = dev.Paired;
		const trusted = dev.Trusted;
		const connected = dev.Connected;
		//let line = addr+' '+dev.Name;
		let line = dev.Name;
		if (paired) line += ' <span class="info">(paired)</span>';
		if (trusted) line += ' <span class="info">(trusted)</span>';
		if (connected) line += ' <span class="info">(connected)</span>';
		if (paired && !trusted) line += ' <button data-mac="'+addr+'" data-act="trst" onclick="doact(event,this)">Trust</button>';
		if (!paired) line += ' <button data-mac="'+addr+'" data-act="pair" onclick="doact(event,this)">Pair</button>';
		if (paired && !connected) line += ' <button data-mac="'+addr+'" data-act="cnct" onclick="doact(event,this)">Connect</button>';
		if (connected) {
			line += ' <button data-mac="'+addr+'" data-act="dscn" onclick="doact(event,this)">Disconnect</button>';
		} else if (paired) {
		//	line += ' <button data-mac="'+addr+'" data-act="rmov" onclick="doact(event,this)">Remove</button>';
		}
		line+='<br>';
		this.sc.send(line);
	}

}

const __blue = new Bluetool();