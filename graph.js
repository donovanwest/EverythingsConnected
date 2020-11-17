/*
The code for d3 and graphs was largely written by oldwnenzi at https://bl.ocks.org/sgcc/7ad094c9acd1877785ee39cde67eb6c7
Edited by Donovan West
*/
const showImagesElement = document.getElementById("showImages");
const popBasedSizeElement = document.getElementById("popBasedSize");
const songNameLabel = document.getElementById("songName");
document.getElementById("nameOfSongLabel").hidden = true;

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
      .velocityDecay(0.3)
      .force("link", d3.forceLink()
                        .distance(300)
                        .id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-200).theta(0.5))
      .force("collide", d3.forceCollide(d => this.getRadius(d)+5))
      .force("center", d3.forceCenter(t.center.x, t.center.y));

    return result;
  }
/*
  getRadius(priority) {
    if(priority <= 0)
        return 40;
    else 
        return this.getRadius(priority-1) * (4/5)
  }
  */
  getRadius(d) {
    if(popBasedSize){
      return Math.max(d.popularity, 5) ;
    } else {
      let radius = 40;
      for(let k = 0; k < d.priority; k++){
        radius *= 4/5;
      }
      return radius;
    }
  }

  getColor(d) { 
    const colors = ["#1DB954", "#8A2BE2", "#00FFFF", "#FF8C00",  "#1E90FF", "#FF69B4", "#FFFF00"];
    if(showImages)
      return "#000";
    else
      return colors[d.priority%colors.length];    
    //return "#1DB954"; 
  }

  getComputedTextLength(d){
    const text = d3.selectAll("#label_" + d.id);
    const textLength = text.node().getComputedTextLength();
    const diameter = 2 * this.getRadius(d);
    const padding = diameter*0.2
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

  handleBackgroundClicked() {
    console.log(`background clicked`);
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
              d3.event.preventDefault();
          })
          .on("click", d => t.handleNodeClicked(d))
          .call(drag);
    let graphNodesExit =
      graphNodesData
        .exit()
        .remove();

    let graphNodeCircles =
      graphNodesEnter
        .append("circle")
        .classed('node', true)
        .attr("cursor", "pointer")
        .attr("r", d => t.getRadius(d))
        .attr("fill", d => t.getColor(d))

    if(showImages){
      t.clipPathId++;
        graphNodesEnter.append("clipPath")
          .attr("id", "clipCircle" + t.clipPathId)
              .append("circle")
              .attr("r", d => t.getRadius(d));
      
      let images = 
        graphNodesEnter
          .append("svg:image")
          .attr("xlink:href", d => d.image)
          .attr("x", d => t.getRadius(d) * -1)
          .attr("y", d => t.getRadius(d) * -1)
          .attr("height", d => t.getRadius(d) * 2)
          .attr("width", d => t.getRadius(d) * 2)
          .attr("clip-path", "url(#clipCircle" + t.clipPathId + ")")
    }
    let graphNodeLabels =
      graphNodesEnter
        .append("text")
        .text(d => `${d.name}`)
        .attr("id", d => "label_" + d.id)
        .style("font-family", "Rubik Mono One", "monospace")
        .style("font-size", d => t.getComputedTextLength(d))
        .attr("text-anchor", "middle")
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
        songNameLabel.textContent = d.label
      });
    
/*
    let linkLabel = graphLinksGroup.selectAll(".link-label").data(links);


    linkLabel.enter().append("svg:text")
    .attr("text-anchor", "middle")
    .attr("class","link-label")
    .attr("x", "70vw")
    .attr("y", "70vw")
    .append("svg:textPath")
    .attr("startOffset", "50%")
    .attr("xlink:href", d =>  "#" + d.source + "," + d.target)
    .text(d => d.label);

    linkLabel.exit().remove();
    console.log(linkLabel);

*/
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
    //console.log(`node clicked: ${JSON.stringify(d)}`);
    const event = new CustomEvent("queueArtist", {"detail" : d});
    document.dispatchEvent(event);
  }

  handleEnd() {
    //console.log("end yo");
  }
}

showImagesElement.oninput = function(){
  showImages = showImagesElement.checked;
}

popBasedSizeElement.oninput = function(){
  popBasedSize = popBasedSizeElement.checked;
}