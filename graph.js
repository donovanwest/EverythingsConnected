/*
The code for d3 and graphs was largely written by oldwnenzi at https://bl.ocks.org/sgcc/7ad094c9acd1877785ee39cde67eb6c7
Edited by Donovan West
*/
//import {queueArtist} from "./app.js";

export class D3ForceGraph {
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
                        .distance(300)
                        .id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-50).distanceMin(100000))
      .force("collide", d3.forceCollide(30))
      .force("center", d3.forceCenter(t.center.x, t.center.y));

    return result;
  }

  getRadius(priority) {
    if(priority <= 0)
        return 40;
    else 
        return this.getRadius(priority-1) * (4/5)
    //return radius;
  }



  getColor(d) { 
    const colors = ["#1DB954", "#8A2BE2", "#00FFFF", "#FF8C00",  "#1E90FF", "#FF69B4", "#FFFF00"];
    return colors[d.priority%colors.length];    
    //return "#1DB954"; 
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
              //t.remove(d);
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
        .attr("r", d => Math.max(t.getRadius(d.priority), 5))
        .attr("fill", d => t.getColor(d));

    let graphNodeLabels =
      graphNodesEnter
        .append("text")
        .attr("id", d => "label_" + d.id)
        .attr("font-size", `10px`)
        .attr("text-anchor", "middle")
        .text(d => `${d.name}`);

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
    //console.log(`node clicked: ${JSON.stringify(d)}`);
    const event = new CustomEvent("queueArtist", {"detail" : d});
    document.dispatchEvent(event);
    //queueArtist(d);
/*
    let t = this;

    let newId = Math.trunc(Math.random() * 1000);
    let newNode = {"id": newId, "name": "server 22", x: d.x, y: d.y};
    let newNodes = [newNode];
    let newLinks = [{source: d.id, target: newNode.id}]

    t.add(newNodes, newLinks);
    */
  }

  handleEnd() {
    //console.log("end yo");
  }
}