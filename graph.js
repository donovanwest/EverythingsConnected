
/*
The code for d3 and graphs was largely written by oldwnenzi at https://bl.ocks.org/sgcc/7ad094c9acd1877785ee39cde67eb6c7
Edited by Donovan West
*/
const showImagesElement = document.getElementById("showImages");
const popBasedSizeElement = document.getElementById("popBasedSize");
const songNameLabel = document.getElementById("songName");
const muteButton = document.getElementById("mute");

let muted = false;
let audio = new Audio();

let showImages = showImagesElement.checked;
let popBasedSize = popBasedSizeElement.checked;

export class D3ForceGraph {
  constructor(graphDiv) {
    let t = this;

    t.graphDiv = graphDiv;
    t.rect = t.graphDiv.getBoundingClientRect();
    t.width = t.graphDiv.scrollWidth;
    t.height = t.graphDiv.scrollHeight;
    t.center = {x: t.width / 2, y: t.height / 2};

    t.svgId = "graph";
    t.updateRefCount = 0;
    t.clipPathId = 0;

    t.scrollTime = 0;
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
    t.background = background;

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
    this.zoom = zoom;
    background.call(zoom);

    let simulation = t.initSimulation();
    t.simulation = simulation;

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
      .attr("height", t.height - 1);

    return result;
  }

  initSimulation() {
    let t = this;
    let result = d3.forceSimulation()
      .velocityDecay(0.3)
      .force("link", d3.forceLink().distance(300).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-300).theta(0.01))
      .force("collide", d3.forceCollide(d => this.getRadius(d)+5))
      .force("center", d3.forceCenter(t.center.x, t.center.y));
    return result;
  }

  getRadius(d) {
    if(popBasedSize){
      return Math.max(d.popularity, 5);
    } else {
      return 40;
    }
  }

  getColor(p, image) { 
    const colors = ["#1DB954", "#8A2BE2", "#00FFFF", "#FF8C00",  "#1E90FF", "#FF69B4", "#FFFF00"];
    if(image)
      return "#000";
    else
      return colors[p%colors.length];    
  }

  getComputedTextLength(d){
    const text = d3.selectAll("#label_" + d.id);
    const textLength = text.node().getComputedTextLength() + 19.8; //19.8 is about enough space for three characters that accommodates the degree
    const diameter = 2 * this.getRadius(d);
    let padding; 
    if(d.name.length <= 7){  //short names get kinda messed up, so this compensates for that
      padding = diameter*0.4
    }
    else{
      padding = diameter*0.25
    }
    return Math.min(diameter, (diameter-padding)/textLength) + "em";
  }

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
        .data(nodes);

    let graphNodesEnter =
      graphNodesData
        .enter()
          .append("g")
          .attr("id", d => d.id || null)
          .on("contextmenu", (d, i)  => d3.event.preventDefault())
          .on("click", d => t.handleNodeClicked(d))
          .on("mousewheel", d => t.handleScroll())
          .call(drag);

    let graphNodeCircles =
      graphNodesEnter
        .append("circle")
        .classed('node', true)
        .attr("cursor", "pointer")
        .attr("r", d => t.getRadius(d))
        .attr("fill", d => t.getColor(d.priority, showImages))
        .attr("data-alt-color", d => t.getColor(d.priority, !showImages));

    
    t.clipPathId++;
    graphNodesEnter.append("clipPath")
      .attr("id", "clipCircle_" + t.clipPathId)
      .append("circle")
      .attr("class", "clipPath")
      .attr("r", d => t.getRadius(d));
    
    let images = 
      graphNodesEnter
        .append("svg:image")
        .attr("class", "nodeImage")
        .attr("xlink:href", d => d.image)
        .attr("x", d => t.getRadius(d) * -1)
        .attr("y", d => t.getRadius(d) * -1)
        .attr("height", d => t.getRadius(d) * 2)
        .attr("width", d => t.getRadius(d) * 2)
        .attr("clip-path", "url(#clipCircle_" + t.clipPathId + ")")
        .attr("visibility", showImages ? "visible" : "hidden");
    
    let graphNodesLabels =
      graphNodesEnter
        .append("text")
        .attr("class", "nodeLabel")
        .text(d => d.name)
        .attr("id", d => "label_" + d.id)
        .style("font-family", "Rubik Mono One", "monospace")
        .style("font-size", d => t.getComputedTextLength(d))
        .attr("text-anchor", "middle")
        .attr("fill", "#FFFFFF")
        .style("text-shadow", "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black");

    let graphDegreeLabels =
      graphNodesEnter
        .append("text")
        .attr("class", "degreeLabel")
        .text(d => d.degree)
        .attr("id", d => "degreeLabel_" + d.id)
        .style("font-family", "Rubik Mono One", "monospace")
        .style("font-size", d => document.getElementById("label_" + d.id).style.fontSize)
        .attr("text-anchor", "middle")
        .attr("y", "1.3em")
        .attr("fill", "#FFFFFF")
        .style("text-shadow", "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black");

    
    // merge
    graphNodesData =
      graphNodesEnter.merge(graphNodesData);

    // links
    let graphLinksData = graphLinksGroup.selectAll("line").data(links);

    let graphLinksEnter = graphLinksData.enter()
      .append("line")
      .attr("id", d => d.source + "," + d.target)
      .on("click", d => {
        document.getElementById("nameOfSongLabel").hidden = false;
        songNameLabel.textContent = d.label;
        audio.pause();
        if(!muted){
          audio = new Audio(d.trackURL);
          audio.play();
        }
      });
    
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

  async add(nodesToAdd, linksToAdd) {
    let t = this;

    if (nodesToAdd) {
      for (let i = 0; i < nodesToAdd.length; i++){
        setTimeout(t.graphData.nodes.push(nodesToAdd[i]), 0);
      }
      
      
    }
    if (linksToAdd) {      
      for (let i = 0; i < linksToAdd.length; i++){
        setTimeout(t.graphData.links.push(linksToAdd[i]), 0);
      }
      
    }

    // update();
    t.update(t, t.simulation, t.graphNodesGroup, t.graphLinksGroup)
    t.simulation.restart();
    t.simulation.alpha(1);
  }

  handleNodeClicked(d) {
    //console.log(`node clicked: ${JSON.stringify(d)}`);
    const event = new CustomEvent("queueArtist", {"detail" : d});
    document.dispatchEvent(event);
  }

  handleScroll(){
    d3.event.preventDefault();
    const zoomWarning = document.getElementById("zoomWarning");
    this.scrollTime = new Date();
    zoomWarning.style.opacity = 1;
    setTimeout(() => {
      if(new Date() - this.scrollTime > 2900)
        zoomWarning.style.opacity = 0;
    }, 3000);
  }

  lookupNode(id){
    return this.graphData.nodes.filter(d => d.id === id)[0];
  }

  lookupLink(source, target){
    return this.graphData.links.filter(d => d.source.id === source && d.target.id === target)[0];
  }
/*
  zoomIn(){
    this.svgGroup
      .attr("transform",
      `translate(${this.zoomX + 1}, ${this.zoomY + 1})` + " " +
      `scale(${this.zoomK*=1.2})`);   
    // const event = new Event("zoom", {target: {name: "g"}, transform: {x: this.zoomX, y: this.zoomY, k: this.zoomK }});
    // this.svgGroup.dispatchEvent(event);
  }

  zoomOut(){
    this.svgGroup
      .attr("transform",
      `translate(${this.zoomX + 1}, ${this.zoomY + 1})` + " " +
      `scale(${this.zoomK*=0.8})`);   
    // const event = new Event("zoom", {target: {name: "g"}, transform: {x: this.zoomX, y: this.zoomY, k: this.zoomK }});
    // this.svgGroup.dispatchEvent(event);
  }
*/
  popBasedSizeInput(){
    popBasedSize = popBasedSizeElement.checked;
    let nodeImages = document.getElementsByClassName("nodeImage");
    let circles = document.getElementsByClassName("node");
    let nodeLabels = document.getElementsByClassName("nodeLabel");
    let clipPaths = document.getElementsByClassName("clipPath");
    let degreeLabels = document.getElementsByClassName("degreeLabel");

    for(let i = 0; i < nodeImages.length; i++){
      const id = circles[i].parentNode.id;
      const node = this.lookupNode(id);

      circles[i].style.r = this.getRadius(node);

      nodeImages[i].style.x = this.getRadius(node) * -1;
      nodeImages[i].style.y = this.getRadius(node) * -1;
      nodeImages[i].style.height = this.getRadius(node) * 2;
      nodeImages[i].style.width = this.getRadius(node) * 2;

      clipPaths[i].style.r = this.getRadius(node);
      nodeLabels[i].style.fontSize = "small";
      nodeLabels[i].style.fontSize = this.getComputedTextLength(node);

      degreeLabels[i].style.fontSize = "small";
      degreeLabels[i].style.fontSize = this.getComputedTextLength(node);
      degreeLabels[i].style.y = "1.3em";
    }
  }

}

showImagesElement.oninput = function(){
  showImages = showImagesElement.checked;
  let nodeImages = document.getElementsByClassName("nodeImage");
  if(!showImages){
    for (let i = 0; i < nodeImages.length; i++){
      nodeImages[i].style.visibility = "hidden";
    }
  } else {
    for (let i = 0; i < nodeImages.length; i++){
      nodeImages[i].style.visibility = "visible";  
    }
  }

  let circles = document.getElementsByClassName("node")
  for (let i  = 0; i < circles.length; i++){
    const temp = circles[i].dataset.altColor;
    circles[i].dataset.altColor = circles[i].style.fill;
    circles[i].style.fill = temp;
  }
}

muteButton.onclick = () => {
  if(!muted){
    muted = true;
    muteButton.style.backgroundImage = "url(images/mute.jpg)";
    audio.pause();
    audio.volume = 0;
  } else {
    muted = false;
    muteButton.style.backgroundImage = "url(images/playing.jpg)";
    audio.volume = 1;
  }
}