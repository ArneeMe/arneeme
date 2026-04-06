let printOut = [];
let allTemperament = [];

function removeThis(value) {
    let newList = [];
    for(let i = 0; i <allTemperament.length; i++){
        if(!allTemperament[i] == value){
            newList.push(allTemperament[i])
        }
    }
    console.log(allTemperament);
    console.log(newList);
    allTemperament = newList;
    createTempButtons();

}
function createTempButtons() {
    let buttonDiv = document.createElement("DIV");
    buttonDiv.id = "buttonDiv";
    document.body.appendChild(buttonDiv);
    for(let i = 0; i < 10 ; i++){ //allTemperament.length
        let button = document.createElement("BUTTON");
        button.innerText = allTemperament[i];
        button.value = allTemperament[i];
        button.onclick = function(){removeThis(button.value)};
        document.getElementById("buttonDiv").appendChild(button)
    }
}
function addToPrint(dog) {
   // console.log(dog.name + " is in the list!")
    printOut.push(dog);
    let dogsTemperament = dog.temperament.split(",");
    for(let i = 0; i < dogsTemperament.length; i++){
        let dogTemp = (dogsTemperament[i].replace(/ /g, ''));
        if(!allTemperament.includes(dogTemp)){
            allTemperament.push(dogTemp);
        };
    }
    createTempButtons();
    //allTemperament.push(do)
    //tempramant
    //bred_for / bred_group
    //life_span

}

function getSize(data) {
    let wantedDogSizeMin = 40; // Maybe 40 to 70
    let wantedDogSizeMax = 70;
    for(let i = 0; i< data.length ; i++){ //data.length
        let height = data[i].height.metric;
        try {
            let matches = height.match(/(\d+) - (\d+)/);
            var number1 = Number(matches[1]);
            var number2 = Number(matches[2]);
            if((number1 >= wantedDogSizeMin) &&(number2 <= wantedDogSizeMax)){
                addToPrint(data[i]);

            }
        }catch(e){
            if((height >= wantedDogSizeMin) &&(height <= wantedDogSizeMax)) {
                addToPrint(data[i])
            }
        }
    }
    console.log(allTemperament);
    return printOut;

}
function updateBreeds(data) {
    let sizeData = getSize(data)
    console.log(sizeData)


}
// make an Ajax request
function ajax_get(url) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            updateBreeds(JSON.parse(xmlhttp.responseText));
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

ajax_get('https://api.thedogapi.com/v1/breeds');


