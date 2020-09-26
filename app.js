const svg = d3.select("svg");
const width = svg.attr("width");
const height = svg.attr("height");

let time1 = Date.now();
let time2 = 0;
let nodeNum = 8;

  //intialize data
  const graph = {
    nodes: [
      { id: 0 },
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 },
      { id: 7 }
    ],
    links: [
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 3, target: 1 },
      { source: 4, target: 2 },
      { source: 7, target: 6 }
    ]
  };
  console.log(graph);
  const simulation = d3
    .forceSimulation(graph.nodes)
    .force("link", d3.forceLink(graph.links))
    .force("charge", d3.forceManyBody().strength(-100))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(1))
    .on("tick", ticked);

  let link = svg.append("g")
    .attr("stroke", "#999")
    .selectAll("line")
    .data(graph.links)
    .join("line")
    .attr("stroke-width", 3);

  let node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("r", 10)
    .attr("fill", "red");
  
  function ticked() {
    time2 = Date.now();
    if(time2 - time1 > 2000){
      time1 = Date.now();
      console.log("pushing node " + nodeNum);
      graph.nodes.push({id: nodeNum});
      graph.links.push({source: nodeNum, target: (Math.floor((Math.random() * nodeNum)))})
      nodeNum++;
      console.log(graph);
      restart();
    }
    link
      .attr("x1", function(d) {
        return d.source.x;
      })
      .attr("y1", function(d) {
        return d.source.y;
      })
      .attr("x2", function(d) {
        return d.target.x;
      })
      .attr("y2", function(d) {
        return d.target.y;
      });

    node
      .attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      });
  }
  
  const drag = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
    node.call(drag);
  function dragstarted(event) {
    //your alpha hit 0 it stops! make it run again
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    // alpha min is 0, head there
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
    
  }

  function restart() {
    node = node.data(graph.nodes);
    node.enter().insert("circle")
        .attr("class", "nodes")
        .attr("r", 10)
        .attr("fill", "green");
    node.exit().remove();

    link = link.data(graph.links);
    link.enter().insert("line")
        .attr("class", "links")
        .attr("stroke", "#999")
        .attr("stroke-width", 3);
    link.exit().remove();

    simulation.restart();
  }

 