/*
The code for d3 and graphs was largely written by oldwnenzi at https://bl.ocks.org/sgcc/7ad094c9acd1877785ee39cde67eb6c7
Edited by Donovan West
*/
class D3ForceGraph {
  constructor(graphDiv, svgId) {
    let t = this;

    t.graphDiv = graphDiv;
    t.rect = t.graphDiv.getBoundingClientRect();
    t.width = t.graphDiv.scrollWidth;
    t.height = t.graphDiv.scrollHeight;
    t.center = {x: t.width / 2, y: t.height / 2};

    t.svgId = svgId;
    t.updateRefCount = 0;
  }

  init() {
    let t = this;

    t.graphData = { "nodes": [], "links": [] };

    // graph area
    let svg = d3.select(t.graphDiv)
      .append("svg")
      .attr('id', t.svgId)
      .attr('width', t.width)
      .attr('height', t.height);

    // Needs to be second, just after the svg itself.
    let background = t.initBackground(t, svg);
    // background

    // Holds child components (nodes, links), i.e. all but the background
    let svgGroup = svg
        .append('svg:g')
          .attr("id", "svgGroup");
    t.svgGroup = svgGroup;

    let graphLinksGroup =
      svgGroup
        .append("g")
        .attr("id", `links_${t.svgId}`)
        .attr("class", "links");
    t.graphLinksGroup = graphLinksGroup;

    let graphNodesGroup =
      svgGroup
        .append("g")
        .attr("id", `nodes_${t.svgId}`)
        .attr("class", "nodes");
    t.graphNodesGroup = graphNodesGroup;

    let zoom =
      d3.zoom()
        .on("zoom", () => t.handleZoom(svgGroup));
    background.call(zoom);


    let simulation = t.initSimulation();
    t.simulation = simulation;

    // update();
    t.update(t, simulation, graphNodesGroup, graphLinksGroup);
  }

  initBackground(t, svg) {
    let result = svg
      .append("rect")
      .attr("id", "backgroundId")
      .attr("fill", "#FFFFFF")
      .attr("class", "view")
      .attr("x", 0.5)
      .attr("y", 0.5)
      .attr("width", t.width - 1)
      .attr("height", t.height - 1)
      .on("click", () => t.handleBackgroundClicked());

    return result;
  }

  initSimulation() {
    let t = this;

    let result = d3.forceSimulation()
      .velocityDecay(0.55)
      .force("link", d3.forceLink()
                        .distance(100)
                        .id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-100).distanceMin(10000))
      .force("collide", d3.forceCollide(25))
      .force("center", d3.forceCenter(t.center.x, t.center.y));

    return result;
  }

  getRadius(d) {
/*    const min = 5;
    const max = 50;
    let r = Math.trunc(500 / (d.id || 1));-
    if (r < min) r = min;
    if (r > max) r = max;
*/
    return Math.floor(Math.random()*20)+3;
  }
  getColor(d) { return "#1DB954"; }

  handleDragStarted(d, simulation) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();

    d.fx = d.x;
    d.fy = d.y;
  }
  handleDragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  handleDragEnded(d, simulation) {
    if (!d3.event.active) simulation.alphaTarget(0);

    d.fx = undefined;
    d.fy = undefined;
  }

  handleBackgroundClicked() {
    console.log(`background clicked in numero 2`);
  }

  handleZoom(svgGroup) {
    svgGroup
      .attr("transform",
      `translate(${d3.event.transform.x}, ${d3.event.transform.y})` + " " +
      `scale(${d3.event.transform.k})`);
  }

  update(t, simulation, graphNodesGroup, graphLinksGroup) {
    let nodes = t.graphData.nodes;
    let links = t.graphData.links;

    let drag =
      d3.drag()
        .on("start", d => t.handleDragStarted(d, simulation))
        .on("drag", d => t.handleDragged(d))
        .on("end", d => t.handleDragEnded(d, simulation));

    // nodes
    let graphNodesData =
      graphNodesGroup
        .selectAll("g")
        .data(nodes, d => d.id);
    let graphNodesEnter =
      graphNodesData
        .enter()
          .append("g")
          .attr("id", d => d.id || null)
          .on("contextmenu", (d, i)  => {
              t.remove(d);
              d3.event.preventDefault();
          })
          //.on("mouseover", d => console.log(`d.id: ${d.id}`))
          .on("click", d => t.handleNodeClicked(d))
          .call(drag);
    let graphNodesExit =
      graphNodesData
        .exit()
        // .call((s) => console.log(`selection exiting. s: ${JSON.stringify(s)}`))
        .remove();

    let graphNodeCircles =
      graphNodesEnter
        .append("circle")
        .classed('node', true)
        .attr("cursor", "pointer")
        .attr("r", d => t.getRadius(d))
        .attr("fill", d => t.getColor(d));

    let graphNodeLabels =
      graphNodesEnter
        .append("text")
        .attr("id", d => "label_" + d.id)
        .attr("font-size", `10px`)
        .attr("text-anchor", "middle")
        .text(d => `${d.id}`);

    // merge
    graphNodesData =
      graphNodesEnter.merge(graphNodesData);

    // links
    let graphLinksData =
      graphLinksGroup
        .selectAll("line")
        .data(links);
    let graphLinksEnter =
        graphLinksData
        .enter()
          .append("line");
    let graphLinksExit =
      graphLinksData
        .exit()
        .remove();
    // merge
    graphLinksData =
      graphLinksEnter.merge(graphLinksData);

    simulation
      .nodes(nodes)
      .on("tick", handleTicked)
      .on("end", () => t.handleEnd());

    simulation
      .force("link")
      .links(links);

    function handleTicked() {
      graphLinksData
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      // Translate the groups
      graphNodesData
          .attr("transform", d => {
            return 'translate(' + [d.x, d.y] + ')';
          });
    }
  }

  add(nodesToAdd, linksToAdd) {
    let t = this;

    if (nodesToAdd) {
      nodesToAdd.forEach(n => t.graphData.nodes.push(n));
    }
    if (linksToAdd) {
      linksToAdd.forEach(l => t.graphData.links.push(l));
    }

    // update();
    t.update(t, t.simulation, t.graphNodesGroup, t.graphLinksGroup)
    t.simulation.restart();
    t.simulation.alpha(1);
  }

  remove(dToRemove) {
    console.log(`dToRemove: ${JSON.stringify(dToRemove)}`)

    let t = this;

    let currentNodes = t.graphData.nodes;
    let currentLinks = t.graphData.links;
    let nIndex = currentNodes.indexOf(dToRemove);
    if (nIndex > -1) {
      currentNodes.splice(nIndex, 1);
    }

    let toRemoveLinks = currentLinks.filter(l => {
      return l.source.id === dToRemove.id || l.target.id === dToRemove.id;
    });
    toRemoveLinks.forEach(l => {
      let lIndex = currentLinks.indexOf(l);
      currentLinks.splice(lIndex, 1);
    })

    t.update(t, t.simulation, t.graphNodesGroup, t.graphLinksGroup)
    t.simulation.restart();
    t.simulation.alpha(1);
  }

  handleNodeClicked(d) {
    console.log(`node clicked: ${JSON.stringify(d)}`);

    let t = this;

    let newId = Math.trunc(Math.random() * 1000);
    let newNode = {"id": newId, "name": "server 22", x: d.x, y: d.y};
    let newNodes = [newNode];
    let newLinks = [{source: d.id, target: newNode.id}]

    t.add(newNodes, newLinks);
  }

  handleEnd() {
    console.log("end yo");
  }
}
  
let graphDiv = document.querySelector("#ib-d3-graph-div");
let graph = new D3ForceGraph(graphDiv, "testSvgId");
graph.init();

setTimeout(() => {
  let initialCount = 10;
  let nodes = [ {"id": 0, "name": "root node"} ];
  let links = [];
  for (var i = 1; i < initialCount; i++) {
    let randomIndex = Math.trunc(Math.random() * nodes.length);
    let randomNode = nodes[randomIndex];
    let newNode = {id: i, name: `node ${i}`};
    let newLink = {source: randomIndex, target: newNode.id};

    nodes.push(newNode);
    links.push(newLink);
  }

  graph.add(nodes, links);

  let count = 0;
  let interval = setInterval(() => {
    let randomIndex = Math.trunc(Math.random() * graph.graphData.nodes.length);
    let randomNode = graph.graphData.nodes[randomIndex];
    let randomId = Math.trunc(Math.random() * 100000);
    let newNode = {"id": randomId, "name": "server " + randomId};
    if (randomNode.x) {
      newNode.x = randomNode.x;
      newNode.y = randomNode.y;
    }
    let newLink = {source: randomNode.id, target: randomId};
    graph.add([newNode], [newLink]);
    count ++;
    if (count % 100 === 0) {
      console.log(`count: ${count}`)
      if (count % 200 === 0) {
        clearInterval(interval);
      }
    }

  }, 10)

}, 500);

class artistPriority{
  constructor(artistId, priority){
    this.artistId = artistId;
    this.priority = priority;
  }
}

const spotifyApi = new SpotifyWebApi();

//This is a temporary measure so that my code can stay on github publicly without revelaing my clientId and Secret.
//I plan to implement oauth stuff eventuall, but for now this is easiest.
import {clientId, clientSecret} from "./Credentials.js"

const dict = {};
let checkedList = [];

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

const queue = new TinyQueue([new artistPriority("0QWrMNukfcVOmgEU0FEDyD", 0)], (a,b) => a.priority - b.priority);

function proccessArtist(artistId, priority){
  return new Promise((resolve) => {
  let connectedArtists = new Set();
  let connectedArtistsData = [];
  spotifyApi.getArtistAlbums(artistId, function (err, artistAlbumData) {
    if (err) console.error(err);
    else{
      artistAlbumData.items.forEach(album => {        
          spotifyApi.getAlbumTracks(album.id, function (err, albumTrackData) {
          if (err) console.error(err);
          else albumTrackData.items.forEach(track => {
            const artistList = track.artists.map(d => {return d.id;});
            let index = 0;
            if(artistList.length > 1 && artistList.includes(artistId)){ 
              artistList.forEach((newArtistId) => {
                if(!(checkedList.includes(newArtistId)) && !(connectedArtists.has(newArtistId))){
                  connectedArtists.add(newArtistId);
                  connectedArtistsData.push({"artistId" : newArtistId, "artistName" : track.artists[index].name, "trackName" : track.name});
                  queue.push(newArtistId, priority+1);
                  //console.log(dict[newArtistId]);
                }
                index++;
              })
            }
          })
        });
      });
      console.log(connectedArtistsData);
      console.log(queue);

      resolve(connectedArtistsData);
    }
  });
});
}


const test = async () => {
  const accessToken = await _getToken();
  console.log(accessToken);
  spotifyApi.setAccessToken(accessToken);
  while(queue.length > 0 && queue.peek().priority < 2){
    const ap = queue.pop();
    console.log(ap.artistId);
    checkedList.push(ap.artistId);
    let connectedArtistsData = await proccessArtist(ap.artistId);
    //let connectedArtistsData = await getArtistAlbums(ap.artistId);
    console.log(connectedArtistsData);
    //queue.push(new artistPriority("4JxdBEK730fH7tgcyG3vuv", ap.priority+1));
    for(let i = 0; i < connectedArtistsData.length; i++){
      console.log(connectedArtistsData[i]);
      //queue.push(new artistPriority(connectedArtistData[i].artistId, ap.priority+1));
    }
    console.log(queue);
  }
}
test();
