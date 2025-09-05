let disp = document.querySelector('.content')

let socket = new WebSocket('ws://'+window.location.hostname+':6689');

socket.onopen = (e) => {
	//let parms = {'yturl': frm.yturl.value.trim(), tname: frm.tname.value.trim(), format: frm.format.value};
	socket.send('hello');
};

socket.onmessage = (event) => {
	//console.log(event.data);
//	msgs.innerHTML += event.data.replace(/\[/g,'<br>[');
	disp.innerHTML += event.data;
};

socket.onerror = (event) => {
	//console.log(event);
//	msgs.innerHTML += event.replace(/\[/g,'<br>[');
	disp.innerHTML += '<br>'+event.message;
};
socket.onclose = (event) => {
	console.log('socket-closed');
};

const doact = (evt, elm) => {
	socket.send(JSON.stringify(elm.dataset));
}

// receive message from containing dialog
// clear display and send message to stop discovery
window.addEventListener('message', (evt) => {
	disp.innerHTML = '';
	// send a bogus action to stop the adapter discovery
	socket.send('{"mac":"00:00:00:00:00:00","act":"xxx"}');
	socket.close();
});