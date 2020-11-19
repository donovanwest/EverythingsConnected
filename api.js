const spotifyApi = new SpotifyWebApi();
const clientId = "e6bf2e305d98443190c472ee318fd511";
export const dict = {};
export class apiCalls{
    
    setAccessToken(at){
        spotifyApi.setAccessToken(at);
    }

    login(){
        const url = String(window.location)
        const scopes = ['user-library-read', 'playlist-read-private', 'playlist-read-collaborative'];
        window.open(`https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${url}&scope=${scopes}&show_dialog=true`, '_self');
    }

    parseForToken(url){
        const startIndex = url.indexOf('=');
        const endIndex = url.indexOf('&', startIndex+1);
        const accessToken = url.substring(startIndex+1, endIndex);
        return accessToken;
    }

    getToken = async () => {
        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/x-www-form-urlencoded', 
                'Authorization' : 'Basic ' + btoa(clientId + ':' + clientSecret)
            },
            body: 'grant_type=client_credentials'
        });
        const data = await result.json();
        return data.access_token;
    }
    
    searchForArtist(name){
        return new Promise((resolve) => {
            spotifyApi.searchArtists(name, function(err, results){
                resolve(results.artists.items[0]);
            })
        })
    }

    getAlbumsOffset(artistId, offset){
        return new Promise((resolve) => {
            spotifyApi.getArtistAlbums(artistId, {"limit" : "50", "include_groups" : "album,single,appears_on", "offset" : offset}, function (err, artistAlbumData) {
                if (err) console.error(err);
                else{
                    const albumIds = artistAlbumData.items.map(d => d.id);
                    resolve(albumIds);
                }        
            })
        })
    }
    
    
    getAlbums(artistId){
        return new Promise(async (resolve) => {
            let albumIds = [];
            let offset = 0;
            let complete = false;
            while(!complete){
                const newAlbumIds = await this.getAlbumsOffset(artistId, offset);
                albumIds = [...albumIds, ...newAlbumIds];
                if(newAlbumIds.length === 50)
                    offset += 50;
                else
                    complete = true;
            }
            resolve(albumIds);
        })
    }
    
    getSeveralAlbums(albumIds, artistId, connectedArtists){
        return new Promise((resolve) => {
            let connectedArtistsData = [];
            spotifyApi.getAlbums(albumIds, function (err, albumsData){
                if (err) console.error(err);
                else{
                    albumsData.albums.forEach(album => {
                        album.tracks.items.forEach(track => {
                            const artistList = track.artists.map(d => {dict[d.id] = d.name; return d.id;});
                            let index = 0;
                            if(artistList.length > 1 && artistList.includes(artistId)){ 
                                artistList.forEach((newArtistId) => {
                                    if(!(newArtistId === artistId) && !(connectedArtists.has(newArtistId))){
                                        connectedArtists.add(newArtistId);
                                        connectedArtistsData.push({"artistId" : newArtistId, "artistName" : track.artists[index].name, "trackName" : track.name});
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
            let connectedArtists = new Set();
            for(let lower = 0; lower < albumIds.length; lower+=20){
                let upper = lower+20;
                if(upper > albumIds.length) upper = albumIds.length;
                const newData = await this.getSeveralAlbums(albumIds.slice(lower, upper), artistId, connectedArtists);
                newData.forEach(dataPoint => {
                    connectedArtistsData.push(dataPoint);
                    connectedArtists.add(dataPoint.id);
                })
            }
            resolve(connectedArtistsData);
        })
    }

    getArtists(artistIds){
        return new Promise(async (resolve) => {
            spotifyApi.getArtists(artistIds, function(err, rawData){
                if (err) console.error(err);
                else{
                    const artistData = rawData.artists.map(d => {
                        let o = new Object();
                        o.popularity = d.popularity;
                        if(d.images.length == 0){
                            o.image = null;
                            o.width = null;
                            o.height = null;
                        }
                        else{
                            o.image = d.images[0].url;
                            o.width = d.images[0].width;
                            o.height = d.images[0].height
                        }
                        return o;
                    })
                    resolve(artistData);
                }
            })
            
        })
    }

    getArtistsData(artistIds){
        return new Promise(async (resolve) => {
            let artistData = [];
            for(let lower = 0; lower < artistIds.length; lower+=50){
                let upper = lower+50;
                if(upper > artistIds.length) upper = artistIds.length;
                const newData = await this.getArtists(artistIds.slice(lower, upper));
                artistData = [...artistData, ...newData];
            }
            resolve(artistData);
        })
    }

}