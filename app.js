import {D3ForceGraph} from "./graph.js";
import {apiCalls, dict} from "./api.js";

document.addEventListener("queueArtist", queueArtist);

let graphDiv = document.querySelector("#ib-d3-graph-div");
let graph = new D3ForceGraph(graphDiv, "testSvgId");
const api = new apiCalls();


class artistPriority{
    constructor(artistId, priority){
      this.artistId = artistId;
      this.priority = priority;
    }
}

const queue = new TinyQueue([], (a,b) => a.priority - b.priority);


const checkedArtists = new Set();
const nonLeafArtists = new Set();
let oneAtATime = false; 
let initialized = false;

async function init(){
  let loggingIn = false;
  const url = String(window.location)
  if(url.search('#') === -1){
    loggingIn = true;
    api.login()
  }
  const accessToken = api.parseForToken(url);
  api.setAccessToken(accessToken);
  let queryName;
  if(!loggingIn) queryName = window.prompt("Enter artist name", "Vulfpeck");
  console.log(queryName);
  const artist = await api.searchForArtist(queryName);
  const startingArtist = {"id" : artist[0] , "name" : artist[1]};
  queue.push(new artistPriority(startingArtist.id, 0))
  dict[startingArtist.id] = startingArtist.name;
  graph.init();
  graph.add([{"id" : startingArtist.id, "name" : startingArtist.name, "priority" : 0}], []);
  checkedArtists.add(startingArtist.id);
  nonLeafArtists.add(startingArtist.id);
}

const runArtistSearch = async () => {
    if(!initialized){
      await init();
      initialized = true;
    } else{
      const accessToken = await api.getToken();
      api.setAccessToken(accessToken);
    }

    while(queue.length > 0 && (queue.peek().priority < 2 || oneAtATime)){
        const ap = queue.pop();
        nonLeafArtists.add(ap.artistId);
        console.log("Artist: " + dict[ap.artistId] + " Priority: " + ap.priority);
        const albumIds = await api.getAlbums(ap.artistId);
        const connectedArtistsData = await api.getConnectedArtists(albumIds, ap.artistId);
        console.log("Number of connected Artists: " + connectedArtistsData.length);
        connectedArtistsData.forEach(artistConnection => {
          if(!checkedArtists.has(artistConnection.artistId)){
            checkedArtists.add(artistConnection.artistId);
            if(!oneAtATime) queue.push(new artistPriority(artistConnection.artistId, ap.priority+1));
            graph.add([{"id" : artistConnection.artistId, "name" : artistConnection.artistName, "priority" : ap.priority+1}], []);
          }
          graph.add([], [{"source" : ap.artistId, "target" : artistConnection.artistId}]);
        });

    }
    if(!oneAtATime){
      console.log("Checked artists: " + checkedArtists.size);
      console.log("Size of queue to check: " + queue.length);
    }
    console.log(graph);
}
runArtistSearch();

function queueArtist(event){
  console.log("Node clicked with name " + event.detail.name + " and priority " + event.detail.priority);
  if(!nonLeafArtists.has(event.detail.id)){
    queue.push(new artistPriority(event.detail.id, event.detail.priority));
    runArtistSearch();
  }
}