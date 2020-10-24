const queue = new TinyQueue([1,2,3,4,5]);
let a = 0;
function promiseFac(n){
    return new Promise((resolve) => {
        if(n === 0){
            resolve(1);
        } else {
            promiseFac(n-1).then((result) => {
                queue.push(result);
                console.log(queue);
                resolve(result * n);
            })
        }
    })
} 
//promiseFac(5).then((result) => {console.log(result); console.log(queue);});

const spotifyApi = new SpotifyWebApi();

import {clientId, clientSecret} from "./Credentials.js"

const _getToken = async () => {
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

function getAlbumsOffset(artistId, offset){
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


function getAlbums(artistId){
    return new Promise(async (resolve) => {
        let albumIds = [];
        let offset = 0;
        let complete = false;
        while(!complete){
            const newAlbumIds = await getAlbumsOffset(artistId, offset);
            albumIds = [...albumIds, ...newAlbumIds];
            if(newAlbumIds.length === 50)
                offset += 50;
            else
                complete = true;
        }
        resolve(albumIds);
    })
}

function getSeveralAlbums(albumIds, artistId, connectedArtists){
    return new Promise((resolve) => {
        let connectedArtistsData = [];
        spotifyApi.getAlbums(albumIds, function (err, albumsData){
            if (err) console.error(err);
            else{
                albumsData.albums.forEach(album => {
                    album.tracks.items.forEach(track => {
                        const artistList = track.artists.map(d => {return d.id;});
                        let index = 0;
                        if(artistList.length > 1 && artistList.includes(artistId)){ 
                            artistList.forEach((newArtistId) => {
                                if(!(connectedArtists.has(newArtistId)) && !(newArtistId === artistId)){
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


function getConnectedArtists(albumIds, artistId){
    return new Promise(async (resolve) => {
        let connectedArtistsData = [];
        let connectedArtists = new Set();
        for(let lower = 0; lower < albumIds.length; lower+=20){
            let upper = lower+20;
            if(upper > albumIds.length) upper = albumIds.length;
            const newData = await getSeveralAlbums(albumIds.slice(lower, upper), artistId, connectedArtists);
            newData.forEach(dataPoint => {
                connectedArtistsData.push(dataPoint);
                connectedArtists.add(dataPoint.id);
            })
        }
        resolve(connectedArtistsData);
    })
}

const test = async () => {
    const accessToken = await _getToken();
    console.log(accessToken);
    spotifyApi.setAccessToken(accessToken);

    let c = 0;
    const artists = ["0QWrMNukfcVOmgEU0FEDyD", "4JxdBEK730fH7tgcyG3vuv", "3F2Rn7Xw3VlTiPZJo6xuwf", "5rwUYLyUq8gBsVaOUcUxpE", "3lFDsTyYNPQc8WzJExnQWn", "7guDJrEfX3qb6FEbdPA5qi"];
    while(c < artists.length){
      const artistId = artists[c];
      console.log(artistId);
      const albumIds = await getAlbums(artistId);
      const connectedArtistsData = await getConnectedArtists(albumIds, artistId);
      console.log(connectedArtistsData);
      c++;
    }
}
test();