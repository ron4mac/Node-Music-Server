var SpotifyWebApi = require('./spotify-web-api.cjs');
var ServerMethods = require('./server-methods.cjs');
SpotifyWebApi._addMethods(ServerMethods);
module.exports = SpotifyWebApi;

//export default {};