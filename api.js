const spotifyApi = new SpotifyWebApi();
const clientId = "e6bf2e305d98443190c472ee318fd511";
const apiRateExceededError = 429;

export class apiCalls{

    login(){
        const url = String(window.location)
        const scopes = ['user-library-read', 'playlist-read-private', 'playlist-read-collaborative', 'user-follow-read'];
        window.open(`https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${url}&scope=${scopes}&show_dialog=true`, '_self');
    }

    parseForToken(url){
        const startIndex = url.indexOf('=');
        const endIndex = url.indexOf('&', startIndex+1);
        const accessToken = url.substring(startIndex+1, endIndex);
        spotifyApi.setAccessToken(accessToken);
    }
    
    searchForArtist(name){
        return new Promise((resolve) => {
            spotifyApi.searchArtists(name, function(err, results){
                if(err) console.error(err);
                resolve(results.artists.items[0]);
            })
        })
    }

    getAlbumsOffset(artistId, offset){
        return new Promise((resolve) => {
            let t = this;
            spotifyApi.getArtistAlbums(artistId, {"limit" : "50", "include_groups" : "album,single,appears_on", "offset" : offset}, function (err, artistAlbumData) {
                if (err) {
                    console.error(err);
                    if(err.status === apiRateExceededError){
                        setTimeout(async function () {
                            resolve(await t.getAlbumsOffset(artistId, offset))
                        }, (err.readyState+1)*1000);
                    }
                }
                else{
                    const albumIds = artistAlbumData.items.map(d => d.id);
                    resolve([albumIds, artistAlbumData.total]);
                }        
            })
        })
    }
    
    getAlbums(artistId){
        return new Promise(async (resolve) => {
            const initialData = await this.getAlbumsOffset(artistId, 0);
            let albumIds = initialData[0];
            let total = initialData[1];
            let tasks = [];
            let offset = albumIds.length;
            while(offset < total){   
                tasks.push(this.getAlbumsOffset(artistId, offset));   
                offset += 50;                
            }
            let result = await Promise.all(tasks);
            result.forEach(group => {
                albumIds = [...albumIds, ...group[0]];
            })
            resolve(albumIds);
        })
    }
    
    getArtistsFromAlbums(albumIds, artistId){
        return new Promise((resolve) => {
            let connectedArtistsData = [];
            let connectedArtists = new Set();
            let t = this;
            spotifyApi.getAlbums(albumIds, function (err, albumsData){
                if (err) {
                    console.error(err);
                    if(err.status === apiRateExceededError){
                        setTimeout(async function () {
                            resolve(await t.getArtistsFromAlbums(albumIds, artistId))
                        }, (err.readyState+1)*1000);
                    }
                }
                else{
                    albumsData.albums.forEach(album => {
                        album.tracks.items.forEach(track => {
                            const artistList = track.artists.map(d => d.id);
                            let index = 0;
                            if(artistList.length > 1 && artistList.includes(artistId)){ 
                                artistList.forEach((newArtistId) => {
                                    if(!(newArtistId === artistId) && !(connectedArtists.has(newArtistId))){
                                        connectedArtists.add(newArtistId);
                                        connectedArtistsData.push({"artistId" : newArtistId, "artistName" : track.artists[index].name, "trackName" : track.name + " by " + album.artists[0].name, "trackURL" : track.preview_url});
                                    }
                                    index++;
                                })
                            }
                        })
                    })
                    resolve(connectedArtistsData);
                }
            })
        })
    }
    
    
    getConnectedArtists(albumIds, artistId){
        return new Promise(async (resolve) => {
            let connectedArtistsData = [];
            let tasks = [];
            for(let lower = 0; lower < albumIds.length; lower+=20){
                let upper = lower+20;
                if(upper > albumIds.length) upper = albumIds.length;
                tasks.push(this.getArtistsFromAlbums(albumIds.slice(lower, upper), artistId));              
            }
            const results = await Promise.all(tasks);
            results.forEach(group => {
                group.forEach(dataPoint => { connectedArtistsData.push(dataPoint); })
            })
            resolve(connectedArtistsData);
        })
    }

    getArtists(artistIds){
        return new Promise(async (resolve) => {
            let t = this;
            spotifyApi.getArtists(artistIds, function(err, rawData){
                if (err) {
                    console.error(err);
                    if(err.status === apiRateExceededError){
                        setTimeout(async function () {
                            resolve(await t.getArtists(artistIds))
                        }, (err.readyState+1)*1000);
                    }
                }
                else{
                    resolve(rawData.artists.map(d => {return {"popularity" : d.popularity, "image" : d.images.length == 0 ? null : d.images[0].url, "name" : d.name, "id" : d.id}}));
                }
            })
            
        })
    }

    getArtistsData(artistIds){
        return new Promise(async (resolve) => {
            let artistData = [];
            let tasks = [];
            for(let lower = 0; lower < artistIds.length; lower+=50){
                let upper = lower+50;
                if(upper > artistIds.length) upper = artistIds.length;
                tasks.push(this.getArtists(artistIds.slice(lower, upper)))
            }
            let result = await Promise.all(tasks);
            result.forEach(group => {
                artistData = [...artistData, ...group];
            });
            resolve(artistData);
        })
    }

    getFollowedArtistsOffset(offset){
        return new Promise((resolve) => {
            spotifyApi.getFollowedArtists({"limit": 50, "after": offset}, function(err, results){
                if (err) {
                    console.error(err);
                    if(err.status === apiRateExceededError){
                        setTimeout(async function () {
                            resolve(await t.getFollowedArtistsOffset(offset))
                        }, (err.readyState+1)*1000);
                    }
                } else {
                    resolve([results.artists.items, results.artists.total]);
                }
            })
        })
    }

    getFollowedArtists(){
        return new Promise(async (resolve) => {
            const initialData = await this.getFollowedArtistsOffset(0);
            let followedArtists = initialData[0];
            let total = initialData[1];
            let tasks = [];
            let offset = followedArtists.length;
            while(offset < total){
                tasks.push(this.getFollowedArtistsOffset(offset));
                offset += 50;
            }
            let result = await Promise.all(tasks);
            result.forEach(group => {
                followedArtists = [...followedArtists, ...group[0]];
            })
            resolve(followedArtists);
        })
    }

    getPlaylistTracks(playlistId, offset){
        console.log(playlistId, offset);
        return new Promise((resolve) => {
            spotifyApi.getPlaylistTracks(playlistId, {"limit": 50, "offset": offset}, function(err, results){
                if (err) {
                    console.error(err);
                    if(err.status === apiRateExceededError){
                        setTimeout(async function () {
                            resolve(await t.getPlaylistTracks(playlistId, offset))
                        }, (err.readyState+1)*1000);
                    }
                } else {
                    console.log(results);
                    resolve([results.items, results.total]);
                }
            })
        })
    }

    getPlaylistArtists(playlistId){
        return new Promise(async (resolve) => {
            const initialData = await this.getPlaylistTracks(playlistId, 0);
            let playlistTracks = initialData[0];
            let total = initialData[1];
            let tasks = [];
            let offset = playlistTracks.length;
            while(offset < total){
                tasks.push(this.getPlaylistTracks(playlistId, offset));
                offset += 50;
            }
            let result = await Promise.all(tasks);
            result.forEach(group => {
                playlistTracks = [...playlistTracks, ...group[0]];
            })
            const playlistArtists = new Set();
            playlistTracks.forEach(track => {
                track.track.artists.forEach(artist => {
                    playlistArtists.add(artist.id);
                })
            })
            resolve(await this.getArtistsData(Array.from(playlistArtists)));
        })
    }
}