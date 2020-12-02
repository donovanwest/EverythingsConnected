import {D3ForceGraph} from "./graph.js";
import {apiCalls} from "./api.js";

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
const loading = document.getElementById("loading");
const deleteButton = document.getElementById("deleteButton");
const moveSidebar = document.getElementById("moveSidebarLeft");
/*
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");
*/
loading.hidden = true;
artistEntry.focus();

let graphDiv = document.querySelector("#ib-d3-graph-div");
let graph = new D3ForceGraph(graphDiv);
graph.init();

const api = new apiCalls();

let queue = new TinyQueue([], (a,b) => a.priority - b.priority);

const checkedArtists = new Set();
const nonLeafArtists = new Set();

let oneAtATime = true; 
let maxDegrees = 2;

async function init(){
  let queryName = artistEntry.value;
  const artist = await api.searchForArtist(queryName);
  if(artist === undefined){
    alert("Artist Not Found");
  }
  if(!checkedArtists.has(artist.id)){
    graph.add([{"id" : artist.id, "name" : artist.name, "priority" : 0, 
    "popularity" : artist.popularity, "image" : artist.images.length > 0 ? artist.images[0].url : null, "degree" : 0}], []);
    queue.push({"artistId" : artist.id, "priority" : 0});
  } else {
    let priority;
    graph.graphData.nodes.forEach(node => {
      if(node.id === artist.id){
        priority = node.priority;
      }
    });
    maxDegrees += priority - 1;
    queue.push({"artistId" : artist.id, "priority" : priority})
  }

  checkedArtists.add(artist.id);
  nonLeafArtists.add(artist.id);
}

const runArtistSearch = async () => {
    loading.hidden = false;
    while(queue.length > 0 && (queue.peek().priority < maxDegrees || oneAtATime)){
        const ap = queue.pop();
        nonLeafArtists.add(ap.artistId);
        const albumIds = await api.getAlbums(ap.artistId);
        const connectedArtistsData = await api.getConnectedArtists(albumIds, ap.artistId);
        const artistData = await api.getArtistsData(connectedArtistsData.map(d => d.artistId));
        let index = 0;
        let sourceNode = graph.lookupNode(ap.artistId);
        let sourceDegreeLabel = document.getElementById("degreeLabel_" + ap.artistId);
        connectedArtistsData.forEach(artistConnection => {
          if(!checkedArtists.has(artistConnection.artistId)){
            checkedArtists.add(artistConnection.artistId);
            totalArtists.textContent = "Total Artists: " + checkedArtists.size;
            if(!oneAtATime) queue.push({"artistId" : artistConnection.artistId, "priority": ap.priority+1});
            graph.add([{"id" : artistConnection.artistId, "name" : artistConnection.artistName, "priority" : ap.priority+1, 
            "popularity" : artistData[index].popularity, "image" : artistData[index].image, "degree" : 0}], []);
          }
          index++;
          graph.add([], [{"source" : ap.artistId, "target" : artistConnection.artistId, "label" : artistConnection.trackName, "trackURL" : artistConnection.trackURL}]);
          if(!nonLeafArtists.has(artistConnection.artistId)){
            let targetNode = graph.lookupNode(artistConnection.artistId);
            targetNode.degree+=1;
            let targetDegreeLabel = document.getElementById("degreeLabel_" + artistConnection.artistId);
            targetDegreeLabel.textContent = targetNode.degree;
            sourceNode.degree+=1;
            sourceDegreeLabel.textContent = sourceNode.degree;
          }
        });
    }
    queue = new TinyQueue([], (a,b) => a.priority - b.priority);
    if(slider.value != maxDegrees)
      maxDegrees = slider.value;
    if(!oneAtATime){
      console.log("Checked artists: " + checkedArtists.size);
      console.log("Size of queue to check: " + queue.length);
    }
    loading.hidden = true;
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
  api.parseForToken(url);
}


function queueArtist(event){
  console.log("Node clicked with name " + event.detail.name + " and priority " + event.detail.priority);
  if(!nonLeafArtists.has(event.detail.id)){
    queue.push({"artistId" : event.detail.id, "priority": event.detail.priority});
    runArtistSearch();
  }
}

slider.oninput = function() {
  const colors = ["#0bdb00", "#0bdb00", "#bfff00", "#e88f00", "#e82e00", "#a80000"]
  degreeLabel.textContent = slider.value;
  degreeLabel.style.color = colors[slider.value];
  maxDegrees = slider.value;
}

oaatRadio.oninput = function() {
  oneAtATime = true;
  console.log(oneAtATime);
  slider.disabled = true;
  degreeLabel.style.color = "#ccc";
}

fullRadio.oninput = function() {
  const colors = ["#0bdb00", "#0bdb00", "#bfff00", "#e88f00", "#e82e00", "#a80000"]
  oneAtATime = false;
  slider.disabled = false;
  degreeLabel.disabled = false;
  degreeLabel.style.color = colors[slider.value];
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

deleteButton.onclick = function(){
  location.reload();
}

moveSidebar.onclick = function(){
  const sidebar = document.getElementById("sidebar");
  if(moveSidebar.textContent === "<<<"){
    sidebar.style.marginLeft = "-256px";
    moveSidebar.textContent = ">>>";
  } else {
    sidebar.style.marginLeft = "10px";
    moveSidebar.textContent = "<<<";
  }
  
  //sidebar.style.visibility = "hidden";
  console.log("clicked");
}

document.getElementById("popBasedSize").oninput = () => graph.popBasedSizeInput();

document.getElementById("githubLink").onclick = () => window.open("https://github.com/donovanwest/EverythingsConnected", "_blank");
document.getElementById("aboutLink").onclick = () => window.open("about.html", "_blank");
document.getElementById("guideLink").onclick = () => window.open("guide.html", "_blank");
/*
zoomIn.onclick = () => graph.zoomIn();
zoomOut.onclick = () => graph.zoomOut();
*/