const overview = document.querySelector(".overview");
const httpStatus = new XMLHttpRequest();
const urlStatus = 'https://gbfs.urbansharing.com/bergenbysykkel.no/station_status.json';
httpStatus.open("GET", urlStatus);
httpStatus.send();

const httpInformation = new XMLHttpRequest();
const urlInformation = ' https://gbfs.urbansharing.com/bergenbysykkel.no/station_information.json'
httpInformation.open("GET", urlInformation);
httpInformation.send();

let shouldRun = true;
let stationAvailability = [];
let returnList = [];
let antall = 0;

httpStatus.onreadystatechange = function () {
    if (shouldRun) {
        if ((httpStatus.responseText != 0) && (httpStatus.readyState = 200)) {
            let allStatusData = httpStatus.responseText;
            allStatusData = JSON.parse(allStatusData);
            let stationsStatus = allStatusData.data.stations;
            for (let i = 0; i < stationsStatus.length; i++) {
                antall = stationsStatus[i].num_bikes_available;
                stationAvailability.push([stationsStatus[i].station_id,stationsStatus[i].num_bikes_available]);
            }
            console.log(antall);
            shouldRun = false;
        }
    }
};
httpInformation.onreadystatechange = function () {
    if ((httpInformation.responseText != 0) && (httpStatus.readyState = 200)) {
        let allInformationData = httpInformation.responseText;
        allInformationData = JSON.parse(allInformationData);
        let stationsData = allInformationData.data.stations;
        for(const elem of stationAvailability){
            for(let j = 0; j < stationsData.length; j++){
                if(elem[0] === stationsData[j].station_id){
                    returnList += (`Det er ${elem[1]} ledige sykler hos ${stationsData[j].name}.\n`)
                }
            }
        }
        console.log(returnList);
      //  if (overview != 0) {
           // overview.innerHTML = `<p>${returnList}<p>`;
       // }
    }
}


