import {D3ForceGraph} from "./graph.js";
import {apiCalls, dict} from "./api.js";

document.addEventListener("queueArtist", queueArtist);

let graphDiv = document.querySelector("#ib-d3-graph-div");
let graph = new D3ForceGraph(graphDiv, "testSvgId");
const api = new apiCalls();
graph.init();

class artistPriority{
    constructor(artistId, priority){
      this.artistId = artistId;
      this.priority = priority;
    }
}
//const startingArtist = {"id" : "0QWrMNukfcVOmgEU0FEDyD" , "name" : "Jacob Collier"}
const startingArtist = {"id" : "7pXu47GoqSYRajmBCjxdD6" , "name" : "Vulfpeck"}
const queue = new TinyQueue([new artistPriority(startingArtist.id, 0)], (a,b) => a.priority - b.priority);

dict[startingArtist.id] = startingArtist.name;
graph.add([{"id" : startingArtist.id, "name" : startingArtist.name, "priority" : 0}], []);

let checkedArtists = new Set();

let oneAtATime = true; 

const runArtistSearch = async () => {
    const accessToken = await api.getToken();
    console.log(accessToken);
    api.setAccessToken(accessToken);

    //const artists = ["0QWrMNukfcVOmgEU0FEDyD", "4JxdBEK730fH7tgcyG3vuv", "3F2Rn7Xw3VlTiPZJo6xuwf", "5rwUYLyUq8gBsVaOUcUxpE", "3lFDsTyYNPQc8WzJExnQWn", "7guDJrEfX3qb6FEbdPA5qi"];
    while(queue.length > 0 && (queue.peek().priority < 1 || oneAtATime)){
        const ap = queue.pop();
        checkedArtists.add(ap.artistId);
        console.log("Artist: " + dict[ap.artistId] + " Priority: " + ap.priority);
        const albumIds = await api.getAlbums(ap.artistId);
        //console.log(albumIds.length);
        const connectedArtistsData = await api.getConnectedArtists(albumIds, ap.artistId);
        console.log("Number of connected Artists: " + connectedArtistsData.length);
        connectedArtistsData.forEach(artistConnection => {
          if(!checkedArtists.has(artistConnection.artistId)){
            if(!oneAtATime) queue.push(new artistPriority(artistConnection.artistId, ap.priority+1));
            graph.add([{"id" : artistConnection.artistId, "name" : artistConnection.artistName, "priority" : ap.priority+1}], [{"source" : ap.artistId, "target" : artistConnection.artistId}]);
          }
        });
    }
    console.log("Checked artists: " + checkedArtists.size);
    console.log("Size of queue to check: " + queue.length);
    console.log(graph);
}
runArtistSearch();

function queueArtist(event){
  console.log(event.detail.name + ": " + event.detail.id);
  queue.push(new artistPriority(event.detail.id, event.detail.priority));
  runArtistSearch();
}