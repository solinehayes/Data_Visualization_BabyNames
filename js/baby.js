// VARIABLES
var yearSlider = document.getElementById("slider");
var yearInfo = document.getElementById("year");

//Useful variables for the visualization :
let dataset =[];
let currentYear = 1980;
var displayingName = false; 
var minOccurences = 100; //Minimum occurences necessary for the bubble to be displayed
var maxOccurences = 60000; //dataset max number is below 60000 so it's as infinite
var selected_name = "";


//Useful variables for scales and layout:
var bubbleSize;
var auto_sizing = false;
let colors = ['#b3cde3', '#fbb4ae', '#3366ff', '#ff6666'];

//useful variables for buttons
var sortType = 0; //0 = no sort, 1 = ascending sort, -1 = descending sort
let girls=true; 
let boys=true; 
let search=document.getElementById("search_name"); 

// Eventlisteners
//yearSlider.addEventListener("input", showSliderValue, false);

// Listeners to window changes
//window.addEventListener('resize', resizeWindow, false);

// set the dimensions and margins of the graph
var bubble_margin = {top: 10, right: 20, bottom: 30, left: 50},
    bubble_width = 600,
    bubble_height = 600
    name_margin = {top: 10, right: 20, bottom: 30, left: 50},
    name_width = 500,
    name_height = 320;

//create bubble graph SVG element
let svg;
let graph;

// Define the div for the tooltip
var tooltip = d3.select('body')                               
                .append('div')                                                
                .attr('class', 'tooltip')
                .style("background",'#919191')
                .attr("width",20)
                .attr("height",10);                                    
                      
tooltip.append('div')                                           
    .attr('class', 'label');                                      
             
tooltip.append('div')                                           
    .attr('class', 'count');                                                                        


//Pack algorithm
var pack = d3.pack()
    .size([bubble_width-100, bubble_height-10])
    .padding(0);


//Loading data
d3.tsv("data/babynames.tsv")
    .row( (d,i) => {
        return {
            gender: +d.sexe,
            name: d.preusuel,
            year : +d.annais,
            number: +d.nombre,
        };
    })
    .get( (error,rows) => {
        if (error) throw error;
        console.log("Loaded " + rows.length + " rows");
        if (rows.length > 0){
            console.log("First row: ", rows[0]);
            console.log("Last row: ", rows[rows.length-1]);
        }
        dataset = rows;

        filter();
    });


//Scale definition
function defineScales(data){
    if(auto_sizing){
        //We try to fill 85% of the total space with bubbles
        let totalArea = 3.14 * bubble_width**2;
        let areaToFill = 85 * totalArea / 100;

        let nbData = data.length;

        let totalSum = 0;

        for(let i = 0; i < nbData; i++){
            totalSum += data[i]["number"];
        }
        
        let maxRadius = (areaToFill / nbData**0.35 / totalSum**0.1 )/1.5 - (totalSum/nbData)*4;
        
        if (currentYear < 1946){
            maxRadius /= 1.2;
        }

        if (nbData <15 && totalSum > 10000){
            if (totalSum < 25000){
                maxRadius /= totalSum / 5000;
            } else {
                
            }
        }

        if (nbData < 85 && totalSum > 450000){
            maxRadius *= 2;
        }

        bubbleSize = d3.scaleSqrt().domain(d3.extent(dataset, (row) => row.number**2))
                       .range([1, maxRadius]);

    } else {
        //Constant scale : area of a bubble proportional to its number, based on the whole dataset
        bubbleSize = d3.scaleSqrt().domain(d3.extent(dataset, (row) => row.number ** 2))
                       .range([1, 120**2]);
    }
}


//Pack Layout
function buildPackLayout(data){
    /* Function that build the layout structure : we use d3.pack
    to make a tree like structure where each circle is a node*/
    let nb = 0; // keeps track of the number of bubbles displayed: if nb=1 no bubbles are displayed
    var root = d3.hierarchy({children: data})
        .sum(function(d) {
            nb += 1;
            return d.number;
        })
        .sort( function(a, b){ 
            if (sortType == 0){
                return (a.data.name < b.data.name) ? -1 : 1;
            } else {
                return (- sortType*(a.value - b.value));
            }
            });
    
    var node = svg.selectAll(".node")
        .data(pack(root).leaves())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + (d.y-50) + ")"; });
    
    if (nb > 1){
        var bubbles = node.append("circle")
        .attr("id", function(d) { return d.id; })
        .attr("r", d => bubbleSize(d.data.number))
        .style("fill", function(d) {
            if (d.data.name.toUpperCase() == selected_name.toUpperCase()){
                return colors[d.data.gender - 1 + 2]; //if this is the selected one, different colors
            }else {  
                return colors[d.data.gender - 1];
            }})
        .on("mouseover", function(d) { 
            tooltip.select('.label').html(d.data.name);                
            tooltip.select('.count').html(d.data.number);                
            tooltip.style("left", (d3.event.pageX) + "px")       
              .style("top", (d3.event.pageY - 28) + "px")
              .transition()        
              .duration(200)        
              .style("opacity", .8); 
          })                    
        .on("mouseout", function(d) {       
            tooltip.transition()        
                .duration(500)      
                .style("opacity", 0);   
        })
        .on("click", function(d){
            selected_name = d.data.name;
            displayOneName();
            displayingName = true;
        })
        
        //Display names in the bubbles if they are large enough
    	node.append("text")
	        .text(function(d) {if (bubbleSize(d.data.number) > 10) {return d.data.name;} return "";})
	        .attr("font-size", function(d){return ((2.7*bubbleSize(d.data.number))/d.data.name.length);})
	        .attr("dy", ".2em")
	        .style("text-anchor", "middle")
	        .attr("font-family", "sans-serif")
            .attr("fill", "#000000");

        //display number also for the biggest ones
        node.append("text")
	        .text(function(d) {if (bubbleSize(d.data.number) > 30) {return d.data.number;} return "";})
	        .attr("font-size", function(d){return ((bubbleSize(d.data.number)/3));})
	        .attr("dy", "1.5em")
	        .style("text-anchor", "middle")
	        .attr("font-family", "sans-serif")
            .attr("fill", "#ff0000");
    }
    
 
}


//Filtering
function filter() {
    let filtered_data=[];
    let name= search.value; 
    console.log("filtering")
    for (let i=0 ; i<dataset.length; i++ ) {
        if ((dataset[i]["name"] != "_PRENOMS_RARES") //filtering irrelevant data
            &&(dataset[i]["year"]==currentYear) //Selecting current year
            
            //Conditions for the girls and boys buttons
            &&((dataset[i]["gender"]==1 && boys)||(dataset[i]["gender"]==2 && girls))

            //Conditions for the search bar
            &&(dataset[i]["name"].startsWith(name.toUpperCase())) 

            //Conditions for the interval slider
            &&(dataset[i]["number"] >= minOccurences)
            &&(dataset[i]["number"] <= maxOccurences)) {

                filtered_data.push(dataset[i]);
        }
    }
    
    d3.select(".bubble_graph").select("svg").remove();

    svg = d3.select(".bubble_graph").append("svg")
    .attr("width", bubble_width).attr("height", bubble_height)
    .append("g")
    .attr("transform", "translate(" + bubble_margin.left + "," + bubble_margin.top + ")");

    
    if (displayingName){
        document.getElementsByClassName("name_graph")[0].style.border="1px grey solid";
        document.getElementsByClassName("name_graph")[0].style.width=name_width+10;
        document.getElementsByClassName("name_graph")[0].style.height=name_width+160;

        d3.select("#svg_number").remove();
        d3.select("#svg_toplist").remove();
        updateCurrentYearNameInfo();
    }

    else{

        //Find rank for the current year
        let tab = [];
        let number=[];
        for (let i=0 ; i<dataset.length; i++ ) {
            if ((dataset[i]["name"] != "_PRENOMS_RARES") //filtering irrelevant data
                &&(dataset[i]["year"]==currentYear) //Selecting current year
                
                //Conditions for the girls and boys buttons
                &&((dataset[i]["gender"]==1 && boys)||(dataset[i]["gender"]==2 && girls))){
                    tab.push(dataset[i]);
                    number.push(dataset[i]["number"])
            }
        }
        number.sort((a, b) => b - a);
        let topfive = [];
        let classes = [];
        for (let i=0 ; i<5; i++ ){
            let found = false;
            for (let j=0; j<number.length; j++){
                if (tab[j]["number"] == number[i] && found == false){
                    topfive.push(tab[j]["name"]);
                    if (tab[j]["gender"] == 1){
                        classes.push(colors[2]);
                    } else {
                        classes.push(colors[3]);
                    }
                    
                    found = true;
                }
            }
        }
        
        document.getElementsByClassName("name_graph")[0].style.width=name_width+10;
        document.getElementsByClassName("name_graph")[0].innerHTML.style = "text-align : center";

        document.getElementById("rank").innerHTML = "The top 5 in " + currentYear + " is :";
        document.getElementById("one").innerHTML = "1. " + topfive[0];
        document.getElementById("one").style.color = classes[0];
        document.getElementById("two").innerHTML = "2. " + topfive[1];
        document.getElementById("two").style.color = classes[1];
        document.getElementById("three").innerHTML = "3. " + topfive[2];
        document.getElementById("three").style.color = classes[2];
        document.getElementById("four").innerHTML = "4. " + topfive[3];
        document.getElementById("four").style.color = classes[3];
        document.getElementById("five").innerHTML = "5. " + topfive[4];
        document.getElementById("five").style.color = classes[4];
    }
    
    
    defineScales(filtered_data);
    buildPackLayout(filtered_data);
}


//Sort buttons
let increase_button= document.getElementById("increasing_button");
let decrease_button= document.getElementById("decreasing_button"); 
let default_button= document.getElementById("default_button"); 

function increasingOrder() {
    sortType = 1;
    increase_button.style.background="#000000";
    decrease_button.style.background="#a0a0a0";
    default_button.style.background="#a0a0a0";
    filter(); 
}
function decreasingOrder(){
    sortType = -1;
    increase_button.style.background="#a0a0a0";
    decrease_button.style.background="#000000";
    default_button.style.background="#a0a0a0";
    filter(); 
}
function defaultOrder(){
    sortType = 0;
    increase_button.style.background="#a0a0a0";
    decrease_button.style.background="#a0a0a0";
    default_button.style.background="#000000";
    filter(); 
}

increase_button.addEventListener("click", increasingOrder);
decrease_button.addEventListener("click", decreasingOrder);
default_button.addEventListener("click", defaultOrder);

//Bubble sizes buttons
let auto_button= document.getElementById("auto_button");
let constant_button= document.getElementById("constant_button"); 

function autoSize() {
    auto_sizing = true;

    auto_button.style.background="#ffffff";
    auto_button.style.color="#000000";
    constant_button.style.background="#f0f0f0";
    constant_button.style.color="#999999";

    filter(); 
}
function constantSize(){
    auto_sizing = false;

    auto_button.style.background="#f0f0f0";
    auto_button.style.color="#999999";
    constant_button.style.background="#ffffff";
    constant_button.style.color="#000000";

    filter(); 
}

auto_button.addEventListener("click", autoSize);
constant_button.addEventListener("click", constantSize);

function nameExistsThisYear() {
    for (let i=0 ; i<dataset.length; i++ ) {
        if (dataset[i]["name"]==name.toUpperCase() && dataset[i]["year"]==currentYear 
            && ((dataset[i]["gender"]==1 && boys)||(dataset[i]["gender"]==2 && girls))) {
            return true;
        }
    }
    return false;
}

//Search

function getName() {
    let name=search.value;
    let nameFound = false;
    // let nameFoundThisYear = false;
    let nameIndex = 0;

    //renvoyer le node de si il y a un nom sinon ne rien faire  ou écrire, ce nom n'existe pas ou juste renvoyer le filter 
    for (let i=0 ; i<dataset.length; i++ ) {
        if (dataset[i]["name"]==name.toUpperCase()) {
            nameFound = true;
            nameIndex = i;
            selected_name=name.toUpperCase(); 
            break;
        }
    }
    if(nameFound) {
        selected_name = dataset[nameIndex].name;
        displayOneName();
        displayingName = true;
    }
    else {
        if (displayingName){removeGraph();}

        $(function () {
            toastr.options = {
                "preventDuplicates": true, 
                "closeButton": false,
                "debug": false,
                "newestOnTop": true,
                "progressBar": false,
                "positionClass": "grid-container",
                "onclick": null,
                "showDuration": "300",
                "hideDuration": "1000",
                "timeOut": "5000",
                "extendedTimeOut": "1000",
                "showEasing": "swing",
                "hideEasing": "linear",
                "showMethod": "fadeIn",
                "hideMethod": "fadeOut"
            }

            Command: toastr.error("The name does not exist.", "Error: ")
        });
    }
}

search.addEventListener("input",filter); 
document.getElementById("search_btn").addEventListener("click",getName); 

search.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("search_btn").click();
  }
}); 

let graphDots; //will be used to update the graph current year dot size
let selectedNameDataset = [];

function updateGraph(){

    selectedNameDataset.forEach(function(d, i){
        graphDots.attr("r", function(d){ //Bigger dot for the current year
            if (currentYear == d.year)
                return 10;
            else 
                return 5;
        })
        .attr("fill", function(d) { return colors[d.gender - 1 + 2*(d.year == currentYear)];})
    })
}

//detail
function displayOneName(){
    document.getElementsByClassName("ranking")[0].style.display= "none";

    name=selected_name;
    console.log("Selected: ", name);

    //change name in first div
    document.getElementById("selectedName").innerHTML = name;

    //Style
    document.getElementsByClassName("name_graph")[0].style.border="1px grey solid";
    document.getElementsByClassName("name_graph")[0].style.width=name_width+10;
    document.getElementsByClassName("name_graph")[0].style.height=name_width+160;
    document.getElementById("close_btn").style.display="unset"; 


    //graph
    if(displayingName) {
    
        d3.select(".name_graph").select("#svg_graph").remove();
        d3.select(".name_graph").select("#svg_year").remove();
        d3.select(".name_graph").select("#svg_toplist").remove();
        d3.select(".name_graph").select("#svg_total").remove();
        d3.select(".name_graph").select("#svg_fun").remove();
        d3.select(".name_graph").select("#svg_number").remove();
        d3.select(".name_graph").select("#svg_similar").remove();
        d3.select(".name_graph").select("#svg_matches").remove();

    }
    graph = d3.select(".name_graph").append("svg")
        .attr("id", "svg_graph")
        .attr("width", name_width)
        .attr("height", name_height);


    //Fill list of occurences by year and find most given year
    selectedNameDataset=[];
    let max = 0;
    let maxYear = 0;
    
    for (let i=0 ; i<dataset.length; i++ ) {
        if (!isNaN(dataset[i]["year"]) && (dataset[i]["name"] == name.toUpperCase())
            &&((dataset[i]["gender"]==1 && boys)||(dataset[i]["gender"]==2 && girls))){
            selectedNameDataset.push(dataset[i]);
            if(dataset[i]["number"] > max){
                max = dataset[i]["number"];
                maxYear = dataset[i]["year"];
            }
        }
    }

    //Total of occurences in all the dataset
    let total = 0;
    for (let i=0 ; i<dataset.length; i++ ) {
        if (!isNaN(dataset[i]["year"]) && (dataset[i]["name"] == name.toUpperCase())){
            total+=dataset[i]["number"];
        }
    }

    d3.select(".name_graph").append("svg")
        .attr("id", "svg_similar")
        .attr("width", 500)
        .attr("height", 30)
        .append("text")
        .attr("x", 20)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .attr("font-weight", "bolder")
        .text("Names that are similar to " + selected_name + ":");

    //Getting similar names : 
    let similarNames = getSimilarNames();
    let textToDisplay = "";
    for (let k=0; k < similarNames.length; k++){
        if ((textToDisplay + (k + 1) +"/ " + similarNames[k]).length <= 62) //Check if this will not exceed svg size
            textToDisplay += (k + 1) +"/ " + similarNames[k] + "  ";
    }
    
    d3.select(".name_graph").append("svg")
        .attr("id", "svg_matches")
        .attr("width", 500)
        .attr("height", 40)
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "15px")
        .attr("color", "#ff0000")
        .text(textToDisplay);

    d3.select(".name_graph").append("svg")
        .attr("id", "svg_fun")
        .attr("width", 500)
        .attr("height", 30)
        .append("text")
        .attr("x", 20)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .attr("font-weight", "bolder")
        .text("Fun facts:");
        
    updateCurrentYearNameInfo();

    d3.select(".name_graph").append("svg")
        .attr("id", "svg_year")
        .attr("width", 500)
        .attr("height", 30)
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .text("- " + maxYear + " : Year during which this name was most given.");

    d3.select(".name_graph").append("svg")
        .attr("id", "svg_total")
        .attr("width", 500)
        .attr("height", 30)
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .text("- " + total + " babies were named " + name + " between 1900 and 2017.");


        
    var g = graph.append("g")
        .attr("transform", "translate(" + name_margin.left + "," + name_margin.top + ")");
    
    var x = d3.scaleTime()
        .domain([new Date(1900, 0, 0), new Date(2017, 0, 0)])
        .range([ name_margin.left, name_width - name_margin.right]);
    
    graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (name_height - name_margin.bottom) + ")")
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")).ticks(d3.timeYear.every(10)));
        
    var y = d3.scaleLinear()
        .domain([0, d3.max(selectedNameDataset, function(d) { return d.number; })])
        .range([ name_height - name_margin.bottom, name_margin.top ]);

    graph.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + name_margin.left + ", 0)")
        .call(d3.axisLeft(y));

    graphDots = graph.append("g")
        .selectAll("dot")
        .data(selectedNameDataset)
        .enter()
        .append("circle")
        .attr("id", function(d) { return d.id; })
        .attr("cx", function(d) { return x(new Date(d.year, 0, 0)) } )
        .attr("cy", function(d) { return y(d.number) } )
        .attr("r", function(d){ //Bigger dot for the current year
            if (currentYear == d.year)
                return 10;
            else 
                return 5;
        })
        .attr("fill", function(d) { return colors[d.gender - 1 + 2*(d.year == currentYear)];})
        .on("mouseover", function(d) { 
            tooltip.select('.label').html(d.year);                
            tooltip.select('.count').html(d.number);                
            tooltip.style("left", (d3.event.pageX) + "px")       
              .style("top", (d3.event.pageY - 28) + "px")
              .transition()        
              .duration(200)        
              .style("opacity", .8);})
        .on("mouseout", function(d) {          
        tooltip.transition()        
            .duration(500)      
            .style("opacity", 0);   
        });

    filter(); //useful to update the color of selected circle
}

function updateCurrentYearNameInfo() {
    //Find rank for the current year
    let tab = [];
    let number=[];
    if(nameExistsThisYear()) {
        for (let i=0 ; i<dataset.length; i++ ) {
            if ((dataset[i]["name"] != "_PRENOMS_RARES") //filtering irrelevant data
                &&(dataset[i]["year"]==currentYear) //Selecting current year
                
                //Conditions for the girls and boys buttons
                &&((dataset[i]["gender"]==1 && boys)||(dataset[i]["gender"]==2 && girls))){
                    tab.push(dataset[i]);
                    number.push(dataset[i]["number"])
            }
        }
    }

    let toplist = 0;
    let indice = -1;
    number.sort((a, b) => b - a);
    console.log("number", number);
    for (let i=0 ; i<tab.length; i++ ){
        if (tab[i]["name"] == name){
            indice = i
        }
    }
    for (let i=0 ; i<number.length; i++ ){
        if (tab[indice]["number"] == number[i]){
            toplist = i+1;
        }
    }
    let numberText = ("- In" + " " + currentYear + " " + "the name" + " " + name + " " + "was not given to anyone. ");
    let toplistText = "";
    if(nameExistsThisYear()) {
        numberText = ("- " + tab[indice]["number"] + " babies were named " + name + " in " + currentYear + ".");
        toplistText = ("- " + toplist + " / " + number.length + " : Rank of this name in " + currentYear + "."); 
    }
    d3.select(".name_graph").append("svg")
        .attr("id", "svg_number")
        .attr("width", 500)
        .attr("height", 30)
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .text(numberText);
        
    d3.select(".name_graph").append("svg")
        .attr("id", "svg_toplist")
        .attr("width", 500)
        .attr("height", 30)
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .text(toplistText);
}

function removeGraph() {
    console.log(displayingName);
    if (displayingName){
        document.getElementsByClassName("ranking")[0].style.display= "flex";
        console.log("removing"); 
        d3.select(".name_graph").select("#svg_graph").remove();
        d3.select(".name_graph").select("#svg_year").remove();
        d3.select(".name_graph").select("#svg_toplist").remove();
        d3.select(".name_graph").select("#svg_total").remove();
        d3.select(".name_graph").select("#svg_fun").remove();
        d3.select(".name_graph").select("#svg_number").remove();
        d3.select(".name_graph").select("#svg_similar").remove();
        d3.select(".name_graph").select("#svg_matches").remove();
        document.getElementById("selectedName").innerHTML = '';

        //Style
        document.getElementsByClassName("name_graph")[0].style.border="0px grey solid";
        document.getElementById("close_btn").style.display="none"; 

        displayingName=false;
        selected_name = "";
        filter();
    }
}

//Getting similar names from selected names
function getSimilarNames(){
    /* Return the list of the X best matches names for the selected name*/

    let maxSimilar = 5; //Max number of similar names we want to display

    let name1 = selected_name;

    if (name1.length == 0){
        return []; //no currently selected name (should not happen)
    }

    let threshold = 0.80; // We keep only if the similarity is above 80%

    let bestMatchesNames = [];
    let bestMatchesDist = [];
    for (let p=0; p < maxSimilar; p++){
        bestMatchesDist.push(0);
        bestMatchesNames.push("");
    }

    //We compare with every name of the dataset
    for (let i = 0; i < dataset.length; i++){
        let name2 = dataset[i]["name"];

        //We first check that the name is different than the selected and that one of the best already found (since one name has several rows) :
        if (name2 == name1 || bestMatchesNames.includes(name2)){
            //do Nothing
        } else {
            
            let dist = distanceString(name1.toUpperCase(), name2.toUpperCase());

            if (dist >= threshold){

                //Search for the lowest similarity in the bestMatches list
                let indexOfMin = -1;
                let minDist = 2; //dist are <= 1 so 2 is like infinite
                for (let j=0; j < maxSimilar; j++){
                    if (bestMatchesDist[j] < minDist){
                        minDist = bestMatchesDist[j];
                        indexOfMin = j;
                    }
                }
                
                if (minDist < dist){ //We found better match than the lowest in the list
                    bestMatchesNames[indexOfMin] = name2;
                    bestMatchesDist[indexOfMin] = dist;
                }
            }
        }        
    }

    
    //Sorting the array of matching names according to their dist
    //1) combine the arrays:
    var list = [];
    for (var j = 0; j < bestMatchesNames.length; j++) {
        list.push({'name': bestMatchesNames[j], 'dist': bestMatchesDist[j]});
    }

    //2) sort:
    list.sort(function(a, b) {
        return ((a.dist < b.dist) ? 1 : -1);
    });

    //3) separate them back out:
    for (var k = 0; k < list.length; k++) {
        bestMatchesNames[k] = list[k].name;
        bestMatchesDist[k] = list[k].dist;
    }

    //Once we explored all the dataset, return the X best matches strings sorted by best matching
    let result = [];
    for (let k = 0; k <maxSimilar; k++){
        if (bestMatchesNames[k] != ""){
            result.push(bestMatchesNames[k]);
        }
    }

    return result;
}

function distanceString(name1, name2){
    /* Compute the distance between two names : we use the Jaro-Winkler
        metric to compare*/

    //JARO DISTANCE : 
    let l1 = name1.length;
    let l2 = name2.length;

    if (l1 == 0 || l2 == 0){
        return 0;
    }

    //Max distance between two char for considering them matching
    let maxDist = Math.max(0, Math.floor( Math.max(l1, l2) / 2 ) - 1);

    //Vector of booleens to indicate if char at this index is a matching char
    let matches1 = [];
    for (let index = 0; index < l1; index ++){
        matches1.push(false);
    }
    let matches2 = [];
    for (let index = 0; index < l2; index ++){
        matches2.push(false);
    }

    //Compute matching characters
    let nbMatchingCharacters = 0;

    for (let i1 = 0; i1 < l1; i1 ++){
        //Compute the range to search
        let minIndex = Math.max(0, i1 - maxDist);
        let maxIndex = Math.min(i1 + maxDist + 1, l2);

        if (minIndex >= maxIndex){
            //No more common char possible for this loop
            break;
        }

        for (let i2 = minIndex; i2 < maxIndex; i2++){
            if (!matches2[i2] && (name1[i1] == name2[i2])){
                //It's a match !
                matches1[i1] = true; 
                matches2[i2] = true;
                nbMatchingCharacters++;
                break;
            }
        }
    }

    if (nbMatchingCharacters == 0){
        return 0;
    }

    //Compute transpositions
    let position1 = [];
    let position2 = [];
    for (let index = 0; index < nbMatchingCharacters; index ++){
        position1.push(0);
        position2.push(0);
    }

    let currentIndex = 0;
    for (let i1 = 0; i1 < l1; i1++){
        if (matches1[i1]){
            position1[currentIndex] = i1;
            currentIndex++;
        }
    }

    currentIndex = 0;
    for (let i2 = 0; i2 < l2; i2++){
        if (matches2[i2]){
            position2[currentIndex] = i2;
            currentIndex++;
        }
    }

    // Calcule half transpositions number
    let nbtrans = 0;
    for (let index = 0; index < nbMatchingCharacters; index++){
        if (name1[position1[index]] != name2[position2[index]]){
            nbtrans++;
        }
    }

    let jaroDist = (nbMatchingCharacters / l1 + nbMatchingCharacters / l2
         + (nbMatchingCharacters - nbtrans) / nbMatchingCharacters) / 3;

    
    // JARO_WINKLER DISTANCE
    let commonPrefix = 0;
    let maxIndex = Math.min(l1, l2, 5);
    for (let index = 0; index < maxIndex; index++){
        if (name1[index] == name2[index]){
            commonPrefix++;
        } else {
            break;
        }
    }

    let winklerCoef = 0.1;
    return (jaroDist + commonPrefix * winklerCoef * (1 - jaroDist));
}

document.getElementById("close_btn").addEventListener("click",removeGraph); 

// Girls and Boys Buttons
let girls_button= document.getElementById("girl_button");
let boys_button= document.getElementById("boy_button"); 

function girlChange() {
    if (!boys) { //If boys is unchecked we don't do anyhting to avodi having no data to show
        return;
    }
    if(girls){
        girls=false; 
        girls_button.style.background="#B6837F";
    } 
    else {
        girls=true; 
        girls_button.style.background="#fbb4ae";
    }
    filter(); 
}
function boyChange(){
    if (!girls) { //If girls is unchecked we don't do anyhting to avodi having no data to show
        return;
    }
    if (boys) {
        boys=false; 
        boys_button.style.background="#6D7D8A"; 
    }
    else {
        boys=true; 
        boys_button.style.background="#b3cde3"; 
    }
    filter(); 
}

girls_button.addEventListener("click",girlChange);
boys_button.addEventListener("click",boyChange);

/* SLIDERS */
$( function() {
    $( "#slider" ).slider({
        orientation: "vertical",
        min: 1900,
        max: 2017,
        value: 1980,
        create: function( event, ui ) {
            $('<span class="ui-slider-tick-mark">' + 1900 + '</span>').css('top', '98%').appendTo($(this)); 
            $('<span class="ui-slider-tick-mark">' + 2017 + '</span>').css('top', '-2%').appendTo($(this)); 
            $( "#year" ).val( 1980 );
        },
        slide: function( event, ui ) {
            $( "#year" ).val( ui.value );
            
            currentYear = ui.value;

            if (displayingName)
                updateGraph();        
            filter();
        }
    });

    $( ".range_slider" ).slider({
        range: true,
        min: 0,
        max: 20000,
        values: [ 100, 20000 ],
        create: function( event, ui ) {
            $('<span class="ui-range-tick-mark"><p>' + 0 + '</p></span>').css('left', '0%').appendTo($(this)); 
            $('<span class="ui-range-tick-mark"><p>20k+</p></span>').css('left', '100%').appendTo($(this)); 
            
            $( "#left_range_handle" ).text( 100 );
            $( "#right_range_handle" ).text( "60k" );
        },
        slide: function( event, ui ) {
            minOccurences = ui.values[0];
            maxOccurences = ui.values[1];
            if (ui.values[1] == 20000) {
                maxOccurences = 60000;
            }

            if (minOccurences >= 1000){
                $( "#left_range_handle" ).text( Math.floor(minOccurences / 1000) + "k" );
            } else {
                $( "#left_range_handle" ).text( minOccurences );
            }

            if (maxOccurences >= 1000){
                $( "#right_range_handle" ).text( Math.floor(maxOccurences / 1000) + "k" );
            } else {
                $( "#right_range_handle" ).text( maxOccurences );
            }

            filter();
        }
      });
});

function showSliderValue() {
    let yearValue = parseInt(yearInfo.value);

    if (yearValue <= 2017 && yearValue >= 1900){
        $( function() {
            $( '#slider' ).slider('option', 'value', yearValue);

            currentYear = yearValue;

            if (displayingName)
                updateGraph();  
            filter();
        });
   }
}


