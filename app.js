import {D3ForceGraph} from "./graph.js";
import {apiCalls, dict} from "./api.js";

document.addEventListener("queueArtist", queueArtist);

const slider = document.getElementById("degreeSlider");
const degreeLabel = document.getElementById("degreeLabel");
const oaatRadio = document.getElementById("oneAtATime");
const fullRadio = document.getElementById("full");
const loginButton = document.getElementById("loginButton");
const searchArtistButton = document.getElementById("searchArtist");
const artistEntry = document.getElementById("artistEntry");
const totalArtists = document.getElementById("totalArtists")
const infoLabel = document.getElementById("infoLabel");
const searchForm = document.getElementById("searchModeSelection")
const displayForm = document.getElementById("displayModeSelection")




let graphDiv = document.querySelector("#ib-d3-graph-div");
let graph = new D3ForceGraph(graphDiv);
graph.init();
const api = new apiCalls();


class artistPriority{
    constructor(artistId, priority){
      this.artistId = artistId;
      this.priority = priority;
    }
}

let queue = new TinyQueue([], (a,b) => a.priority - b.priority);


const checkedArtists = new Set();
const nonLeafArtists = new Set();
let oneAtATime = true; 
let maxDegrees = 2;

async function init(){
  let queryName = artistEntry.value;
  console.log(queryName);
  const artist = await api.searchForArtist(queryName);
  dict[artist.id] = artist.name;
  if(!checkedArtists.has(artist.id)){
    graph.add([{"id" : artist.id, "name" : artist.name, "priority" : 0, 
    "popularity" : artist.popularity, "image" : artist.images[0].url, "width" : artist.images[0].width, "height" : artist.images[0].heigth}], []);
    queue.push(new artistPriority(artist.id, 0))
  } else {
    let priority;
    graph.graphData.nodes.forEach(node => {
      if(node.id === artist.id){
        priority = node.priority;
      }
    });
    maxDegrees += priority - 1;
    queue.push(new artistPriority(artist.id, priority))
  }

  checkedArtists.add(artist.id);
  nonLeafArtists.add(artist.id);
}

const runArtistSearch = async () => {
    while(queue.length > 0 && (queue.peek().priority < maxDegrees || oneAtATime)){
        const ap = queue.pop();
        nonLeafArtists.add(ap.artistId);
        console.log("Artist: " + dict[ap.artistId] + " Priority: " + ap.priority);
        let timeStart = new Date();
        const albumIds = await api.getAlbums(ap.artistId);
        console.log("getAlbums time: " + (new Date() - timeStart) + "ms");
        timeStart = new Date();
        const connectedArtistsData = await api.getConnectedArtists(albumIds, ap.artistId);
        console.log("getConnectedArtists time: " + (new Date() - timeStart) + "ms");
        console.log("Number of connected Artists: " + connectedArtistsData.length);
        timeStart = new Date();
        const artistData = await api.getArtistsData(connectedArtistsData.map(d => d.artistId));
        console.log("getArtistsData time: " + (new Date() - timeStart) + "ms");
        let index = 0;
        timeStart = new Date();
        connectedArtistsData.forEach(artistConnection => {
          if(!checkedArtists.has(artistConnection.artistId)){
            checkedArtists.add(artistConnection.artistId);
            if(!oneAtATime) queue.push(new artistPriority(artistConnection.artistId, ap.priority+1));
            graph.add([{"id" : artistConnection.artistId, "name" : artistConnection.artistName, "priority" : ap.priority+1, 
            "popularity" : artistData[index].popularity, "image" : artistData[index].image, "width" : artistData[index].width, "height" : artistData[index].height}], []);
          }
          index++;
          graph.add([], [{"source" : ap.artistId, "target" : artistConnection.artistId, "label" : artistConnection.trackName}]);
        });
        console.log("addingArtists time: " + (new Date() - timeStart) + "ms");
        totalArtists.textContent = "Total Artists: " + checkedArtists.size;


    }
    queue = new TinyQueue([], (a,b) => a.priority - b.priority);
    if(slider.value != maxDegrees)
      maxDegrees = slider.value;
    if(!oneAtATime){
      console.log("Checked artists: " + checkedArtists.size);
      console.log("Size of queue to check: " + queue.length);
    }
    console.log(graph);
}

const url = String(window.location)
if(url.search('#') === -1){
  searchArtistButton.disabled = true;
  fullRadio.disabled = true;
  oaatRadio.disabled = true;
  artistEntry.disabled = true;
  document.getElementById("showImages").disabled = true;
  document.getElementById("popBasedSize").disabled = true;
} else {
  infoLabel.hidden = true;
  loginButton.disabled = true;
  const accessToken = api.parseForToken(url);
  api.setAccessToken(accessToken);
}

function queueArtist(event){
  console.log("Node clicked with name " + event.detail.name + " and priority " + event.detail.priority);
  if(!nonLeafArtists.has(event.detail.id)){
    queue.push(new artistPriority(event.detail.id, event.detail.priority));
    runArtistSearch();
  }
}

slider.oninput = function() {
  degreeLabel.textContent = slider.value;
  maxDegrees = slider.value;
}

oaatRadio.oninput = function() {
  oneAtATime = true;
  console.log(oneAtATime);
  slider.disabled = true;
  degreeLabel.style.color = "#ccc";
}

fullRadio.oninput = function() {
  oneAtATime = false;
  console.log(oneAtATime);
  slider.disabled = false;
  degreeLabel.disabled = false;
  degreeLabel.style.color = "#000";
}

loginButton.onclick = function(){
  api.login();
}

searchArtistButton.onclick = async function(){
  let timeStart = new Date();
  await init();
  console.log("init time: " + (new Date() - timeStart) + "ms");
  runArtistSearch();
}

artistEntry.onkeyup = async function(e){
  if(e.keyCode == '13'){
    await init();
    runArtistSearch();
  }
}


