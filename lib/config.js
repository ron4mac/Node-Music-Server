export var config = {
	port: 6680,
	socket: 6683,
	pandora_socket: 6681,
	baseDir: '/media/nodems/',
	upldTmpDir: '/tmp/',
	playlistDir: 'playlists/',
	extr2Intrn: true
};
// when used in the client context
if (typeof window == 'object') window.config = config;
