/*  App created by Donovan West
    Created for KSU Senior Project Spring 2021
    Last updated February 2022
*/

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
const loading = document.getElementById("loading");
const deleteButton = document.getElementById("deleteButton");
const moveSidebar = document.getElementById("moveSidebarLeft");
const showLeavesCheckBox = document.getElementById("showLeaves");
const addFollowedArtistsButton = document.getElementById("addFollowedArtists");
const smartFilterCheckBox = document.getElementById("smartFilter");
const addRandomArtistButton = document.getElementById("addRandomArtist");
const getStarted = document.getElementById("getStarted");

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
  let artists = [];
  if(queryName.search("https://open.spotify.com/playlist/") != -1)
    artists = await api.getPlaylistArtists([getId(queryName)]);
  else if(queryName.search("https://open.spotify.com/artist/") != -1)
    artists = await api.getArtistsData([getId(queryName)]);
  else
    artists = [await api.searchForArtist(queryName)];
  if(artists === undefined || artists[0] === undefined){
    alert("Artist or Playlist Not Found");
  } else {
    artists.forEach(artist => {
      if(!checkedArtists.has(artist.id)){
        graph.add([{"id" : artist.id, "name" : artist.name, "priority" : 0, 
        "popularity" : artist.popularity, "image" : artist.image ? artist.image : artist.images && artist.images.length > 0 ? artist.images[0].url : null, "degree" : 0}], []);
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
    })
    
  }
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
          if( !(smartFilterCheckBox.checked &&
            (artistData[index].popularity < 10 ||
            artistData[index].image == null))
          ){
            if(!checkedArtists.has(artistConnection.artistId)){
              checkedArtists.add(artistConnection.artistId);
              totalArtists.textContent = "Total Artists: " + checkedArtists.size;
              if(!oneAtATime) queue.push({"artistId" : artistConnection.artistId, "priority": ap.priority+1});
              graph.add([{"id" : artistConnection.artistId, "name" : artistConnection.artistName, "priority" : ap.priority+1, 
              "popularity" : artistData[index].popularity, "image" : artistData[index].image, "degree" : 0}], []);
            }
            index++;
            if(graph.lookupLink(ap.artistId, artistConnection.artistId) == undefined && graph.lookupLink(artistConnection.artistId, ap.artistId) == undefined){
              graph.add([], [{"source" : ap.artistId, "target" : artistConnection.artistId, "label" : artistConnection.trackName, "trackURL" : artistConnection.trackURL, "trackLink" : artistConnection.trackLink}]);
              let targetNode = graph.lookupNode(artistConnection.artistId);
              targetNode.degree+=1;
              let targetDegreeLabel = document.getElementById("degreeLabel_" + artistConnection.artistId);
              targetDegreeLabel.textContent = targetNode.degree;
              sourceNode.degree+=1;
              sourceDegreeLabel.textContent = sourceNode.degree;
            }
          } else {index++;}
        });
        graph.changeLeaves();
    }
    oaatRadio.checked = true;
    slider.disabled = true;
    degreeLabel.style.color = "#ccc";
    oneAtATime = true;
    queue = new TinyQueue([], (a,b) => a.priority - b.priority);
    if(slider.value != maxDegrees)
      maxDegrees = slider.value;
    loading.hidden = true;
    console.log(graph);
   
}

const url = String(window.location)
if(url.search('#') === -1){
  loading.hidden = false;
  addFollowedArtistsButton.disabled = true;
  //Get the access token. It's in a private server so you can't yank my client secret ;)
  fetch('https://access-token.everythings-connected.com/accessToken').then(response => {
    loading.hidden = true;
    if(response.status != 200){
      alert("Error getting Spotify access token. Try refreshing the page or signing in.\n" + response.status + ": " + response.statusText);
      searchArtistButton.disabled = true;
      addFollowedArtistsButton.disabled = true;
      addRandomArtistButton.disabled = true;
      fullRadio.disabled = true;
      oaatRadio.disabled = true;
      artistEntry.disabled = true;
      smartFilterCheckBox.disabled = true;
      showLeavesCheckBox.disabled = true;
      document.getElementById("showImages").disabled = true;
      document.getElementById("popBasedSize").disabled = true;
    }
    response.text().then(token => {
      api.setAccessToken(token);
    });
  });
} else {
  loginButton.disabled = true;
  loginButton.hidden = true;
  api.parseForToken(url);
}

const mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

if(mobileAndTabletCheck()){
  if(!window.sessionStorage.getItem('mobileAlert')){
    window.sessionStorage.setItem('mobileAlert', true);
    alert("Mobile device or tablet detected. While this app works on mobile, it was designed for and is recommended for desktop use. " + 
            "The controls and the main display operate on two separate planes so you must pinch to zoom each separately.")
  }
}


function queueArtist(event){
  console.log("Node clicked with name " + event.detail.name + " and priority " + event.detail.priority);
  queue.push({"artistId" : event.detail.id, "priority": event.detail.priority});
  runArtistSearch();
}

const getId = (url) => {
  const start = url.lastIndexOf("/")+1;
  let end = -1;
  if(url.search("si=") != -1){
    end = url.search("si=")-1;
  } else {
    end = url.length;
  }
  return url.substring(start, end);
}

showLeavesCheckBox.onclick = () => graph.changeLeaves();

slider.oninput = function() {
  const colors = ["#0bdb00", "#0bdb00", "#bfff00", "#e88f00", "#e82e00", "#a80000"]
  degreeLabel.textContent = slider.value;
  degreeLabel.style.color = colors[slider.value];
  maxDegrees = slider.value;
}

oaatRadio.oninput = function() {
  oneAtATime = true;
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
  getStarted.hidden = true;
  await init();
  runArtistSearch();
}

artistEntry.onkeyup = async function(e){
  if(e.keyCode == '13'){
    getStarted.hidden = true;
    await init();
    runArtistSearch();
  }
}

addFollowedArtistsButton.onclick = async function(){
  addFollowedArtistsButton.disabled = true;
  getStarted.hidden = true;
  const followedArtists = await api.getFollowedArtists();
  if(followedArtists.length === 0){
    alert("You haven't followed any artists!");
  } else {
    followedArtists.forEach(artist => {
      if(!checkedArtists.has(artist.id)){
        graph.add([{"id" : artist.id, "name" : artist.name, "priority" : 0, 
          "popularity" : artist.popularity, "image" : artist.images.length > 0 ? artist.images[0].url : null, "degree" : 0}], []);
        if(!oneAtATime)
          queue.push({"artistId" : artist.id, "priority" : 0});
        else 
          checkedArtists.add(artist.id);
      } 
    });
  }
  graph.changeLeaves();
  runArtistSearch();
}

addRandomArtistButton.onclick = async function(){
  getStarted.hidden = true;
  loading.hidden = false;
  const artist = await api.getRandomArtist();
  console.log(artist);
  graph.add([{"id" : artist.id, "name" : artist.name, "priority" : 0,
    "popularity" : artist.popularity, "image" : artist.images.length > 0 ? artist.images[0].url : null, "degree" : 0}], []);
  queue.push({"artistId" : artist.id, "priority" : 0});
  checkedArtists.add(artist.id);
  graph.changeLeaves();
  runArtistSearch();
}

deleteButton.onclick = function(){
  location.reload();
}

moveSidebar.onclick = function(){
  const sidebar = document.getElementById("sidebar");
  if(moveSidebar.textContent === "<<<"){
    sidebar.style.marginLeft = "-275px";
    moveSidebar.textContent = ">>>";
  } else {
    sidebar.style.marginLeft = "10px";
    moveSidebar.textContent = "<<<";
  }
}

document.getElementById("popBasedSize").oninput = () => graph.popBasedSizeInput();
document.getElementById("githubLink").onclick = () => window.open("https://github.com/donovanwest/EverythingsConnected", "_blank");
document.getElementById("aboutLink").onclick = () => window.open("about.html", "_self");
document.getElementById("guideLink").onclick = () => window.open("guide.html", "_self");
document.getElementById("privacyPolicyLink").onclick = () => window.open("privacyPolicy.html", "_self");
document.getElementById("homeLink").onclick = () => window.open("index.html", "_self");