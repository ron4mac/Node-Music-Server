import WebSocket, { WebSocketServer } from 'ws';

export default class Bluetool {

	constructor () {
		this.ws = new WebSocketServer({port:6689});
		this.ws.on('connection', (sc) => {
			sc.on('error', console.error);
			sc.on('message', (data) => {
				console.log('blue received: %s', data);
			});
			sc.send('HELLO <button data-addr="00:00:00:00:00:00">Connect</button><br>');
			const wait = setInterval(() => { sc.send('HELLO AGAIN <button data-addr="00:00:00:00:00:00">Connect</button><br>'); }, 4000);
		});
		//this.#playSocket();
		console.log('Starting bluetooth tool');
	}

	static async init (mpdc, settings) {
		const client = new Connect(settings.pandora_user, settings.pandora_pass);
		let rslt = false;	//await this.#login(client);
		return rslt ? null : new Pandora(client, mpdc, true);
	}

}

const __blue = new Bluetool();