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

let graphDiv = document.querySelector("#ib-d3-graph-div");
let graph = new D3ForceGraph(graphDiv, "testSvgId");
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
let initialized = false;
let loggedIn = false;
let maxDegrees = 2;

async function init(){
  let queryName = artistEntry.value;
  console.log(queryName);
  const artist = await api.searchForArtist(queryName);
  const startingArtist = {"id" : artist[0] , "name" : artist[1]};
  dict[startingArtist.id] = startingArtist.name;
  if(!checkedArtists.has(startingArtist.id)){
    graph.add([{"id" : startingArtist.id, "name" : startingArtist.name, "priority" : 0}], []);
    queue.push(new artistPriority(startingArtist.id, 0))
  } else {
    let priority;
    graph.graphData.nodes.forEach(node => {
      if(node.id === startingArtist.id){
        priority = node.priority;
      }
    });
    maxDegrees += priority - 1;
    queue.push(new artistPriority(startingArtist.id, priority))
  }

  checkedArtists.add(startingArtist.id);
  nonLeafArtists.add(startingArtist.id);
}

const runArtistSearch = async () => {
    while(queue.length > 0 && (queue.peek().priority < maxDegrees || oneAtATime)){
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
    queue = new TinyQueue([], (a,b) => a.priority - b.priority);
    if(slider.value != maxDegrees)
      maxDegrees = value;
    if(!oneAtATime){
      console.log("Checked artists: " + checkedArtists.size);
      console.log("Size of queue to check: " + queue.length);
    }
    console.log(graph);
}

const url = String(window.location)
if(url.search('#') === -1){
  loggedIn = false;
} else {
  loggedIn = true;
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
  await init();
  runArtistSearch();
}

artistEntry.onkeyup = async function(e){
  if(e.keyCode == '13'){
    await init();
    runArtistSearch();
  }
}
