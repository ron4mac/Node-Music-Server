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
