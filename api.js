import {clientId, clientSecret} from "./Credentials.js";

const spotifyApi = new SpotifyWebApi();
export const dict = {};

//const access_token = "";

export class apiCalls{
    
    setAccessToken(at){
        //access_token = at;
        spotifyApi.setAccessToken(at);
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

}