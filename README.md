# Node-Music-Server  
### My Music Server written for Node  
Developed on Raspberry Pi OS (bookworm) _[ a work in progress ]_  
Created for my own use ... so support may be limited.

**Features:**
- Local file storage with file manager
- Upload files; create playlists
- Tunein Radio stations
- Pandora playlists
- Calm Radio stations
- Spotify capable
- YouTube extraction
- Tag favorites
- Sound output at server or at client (except Spotify)

**Requirements (linux):**  
&nbsp; &nbsp;npm and nodejs - install and run the server  
&nbsp; &nbsp;mpd - play music thru server connected audio output  
&nbsp; &nbsp;zip/unzip - for use by file manager  
&nbsp; &nbsp;ffmpeg - needed if filemanger will be used to combine media files  
&nbsp; &nbsp;librespot - required for Spotify use  

**Notes:**  
If using Samba, in smb.conf [global] add: __veto files = /.DS_Store/._*/__ to prevent Apple dot files
