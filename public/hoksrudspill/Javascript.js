let areYouSure = false;
const leaveButton = document.querySelector("#leaveGameButton")
function leaveGame(){
    if (!areYouSure){
        leaveButton.innerHTML = "Trykk en gang til for å forlate"
        areYouSure = true;
    }
    else{
        location.replace("../code.html")
    }

}
let player = document.getElementById("player"); // oppretter en variabel som refererer til div-elementet
let sjokomelk = document.getElementById("sjokomelk");
let moxnes = document.getElementById("moxnes");
let playerX = 1; //Startposisjon til player
let playerY= 1;

let sjokomelkX= 800+(Math.floor(Math.random()*200)); //Startposisjon til sjokolademelk (eller det du skal prøve å ta)
let sjokomelkY = Math.floor(Math.random()*400);
sjokomelk.style.marginLeft = sjokomelkX +"px";
sjokomelk.style.marginTop = sjokomelkY +"px";

let moxnesX = 1000; //Startposisjon til det som prøver å fange deg
let moxnesY = Math.floor(Math.random()*400);
moxnes.style.marginLeft= moxnesX + "px"; //faktisk endrer
moxnes.style.marginTop = moxnesY + "px";


let level = 1; //Levelet du er på
let vansklighetsgradTall = 1; //Vansklighetsgraden øker men level, men synker hvis du ikke klarer lv1
let sjekkVinn; //Variabel som jeg bruker for å sette kollisjon som enten True eller False

let lydVinn = document.getElementById("lydVinn"); //Henter lydelement fra HTML
lydVinn.volume = 0.05;
let lydTap = document.getElementById("lydTap");
lydTap.volume = 0.05;

let n =0; //Variabel i sammenheng med å bytte playerIcon
let hoksrud = ["bardhoksrudRedigert1.jpg", "sjokomelkRedigert1.jpg", "moxnes2Redigert1.jpg", "Bård Hoksrud","sjokomelk","Moxnes", "ghostwhite"];
let fregatt =["fregattRedigert.jpg","natoRedigert.jpg", "tankskipRedigert.jpg", "Helge Ingstad","Nato", "tankskip Sola", "lightcyan" ];
let hillary = ["hillary.jpg", "whitehouse.jpg","putin.jpg", "Hillary Clinton","det hvite hus", "Putin", "lightgrey"];
let iconArray = [hoksrud, fregatt, hillary];
// Arrayer med flere egenskaper som endres i det du trykker på "bytt player icon" knappen. Enkelt å legge til flere.

window.onkeydown = function(event){
    if( event.code === "ArrowLeft" || event.code === "ArrowUp"||event.code === "ArrowDown" || event.code === "ArrowRight" ) {
      //Ingen grunn til at koden kjører hvis det ikke er en av piltastene som spliieren trykker på
        if (playerX > 0) {
            if (event.code === "ArrowLeft") {
                playerX = playerX - 5;
            }
        }
        if (playerY > 0) {
            if (event.code === "ArrowUp") {
                playerY = playerY - 5;
            }
        }
        if (playerY < 450) {
            if (event.code === "ArrowDown") {
                playerY = playerY + 5;
            }
        }
        if (playerX < 1000) {
            if (event.code === "ArrowRight") {
                playerX = playerX + 5;

            }
        }
        player.style.marginLeft = playerX + "px"; // player sin marginLeft skal være lik verdien av playerX pluss stringen "px"
        player.style.marginTop = playerY + "px";
        posisjonMoxnes();
        sjekkKollisjon();
    }
};

function posisjonMoxnes () {
    moxnesX = moxnesX - ((vansklighetsgradTall/100)*(moxnesX-playerX)); //Algoritmen for moxnes sin bevegelse, kan godt være jobbet mer med
    moxnesY = moxnesY-((vansklighetsgradTall/70)*(moxnesY-playerY));
    moxnes.style.marginLeft = moxnesX + "px";
    moxnes.style.marginTop = moxnesY + "px";
}
function sjekkKollisjon () { //Funksjonen som sjekker om noen av bildene kræsjer med hverandre
    let hoksrudArray = ["Hoksrud",playerX, playerY];
    let moxnesArray = ["Moxnes", moxnesX, moxnesY];
    let sjokomelkArray = ["Sjokomelk", sjokomelkX, sjokomelkY];
    let bildeArray = [hoksrudArray, moxnesArray, sjokomelkArray];
    //arrays med array. Navn og kordinater

    for (let i = 0; i <= 2; i++) {
        let a = bildeArray [i];
        console.log("A = " + a);

        for (let h = 0; h <= 1; h++) { //For-løkke innen for-løkke for å sjekke alle bildene med hverandre
            let b = bildeArray[h];
            if (i !== h) { //Prøver å hindre løkken å kjøre mer enn nødvendig. Nå kjører den bare 1 gang for mye
                console.log("B = " + b);
                let vektorMellomBilder = [a[1] - b[1], a[2] - b[2]];
                let absMellomBilder = Math.round(Math.sqrt(((vektorMellomBilder[0]) * (vektorMellomBilder[0])) + ((vektorMellomBilder[1]) * (vektorMellomBilder[1]))));
                let radiusDifferanse = absMellomBilder - (100/2) - (100/2);
                console.log ("Differansen i radius er " + radiusDifferanse);
                //Vektoriell matte som sjekker vektorene mellom bildene. Så sjekker den absoluttverdien til vektormellombilder
                //Hvis differansen mellom bildene er mindre enn radiusen til hver av bildene har det da oppstått en kollisjon
                if (radiusDifferanse <= 0) {
                    if (a[0] === "Hoksrud" && b[0] === "Moxnes"){

                        sjekkVinn = false; //Sier at hoksrud og moxnes har kollidert og at spilleren ikke har vunnet
                        sjekklevel (); //kjører funksjonen som sjekker level og tilbakestiller posisjon
                        lydTap.play(); //kjører lydtap lydfil
                    }
                    else if (a[0] === "Sjokomelk" && b[0] === "Hoksrud"){
                        sjekkVinn = true; //Samme som over bare at spilleren har vunnet
                        level++; //Øker denne gangen levelet siden spilleren har vunnet dette levelet
                        sjekklevel ();
                        lydVinn.play();
                    }

                    /*  else if (a[0] === "Sjokomelk" && b[0] === "Moxnes"){
                          prompt("Uffda, da fikk fienden sjokomelken din!")
                      }
                      Mulighet for å legge til kollisjon mellom sjokomelk og moxnes */

                }
            }
        }
    }

}
function byttPlayerIcon(){

    if ( n < iconArray.length-1) {
        n++
    }
    else {
        n=0
    }

    player.src = iconArray[n][0]; //verdiene til iconArray: de tre første (fra 0 til 2) er nye bilder
    sjokomelk.src= iconArray[n][1];
    moxnes.src=iconArray[n][2];
    document.getElementById("info").innerHTML = "Du (" + iconArray[n][3] + ") skal prøve å komme til " + iconArray[n][4] + ". Men ikke la " + iconArray[n][5] + " ta deg! (Piltaster for å bevege)";
    //nr 3 , 4 og 5 er navnene til bildene for å forklarer for bruker av nettsiden hva man skal gjøre.
    document.body.style.backgroundColor = iconArray[n][6]; //En fargeverdi for å endre det estetiske i tråd med temaet på bildene
}
function sjekklevel(){ //funksjonen som gjør at det blir vanskligere jo flere ganger du har klart det
    playerX = 1;
    playerY= 1;
    moxnesX=1000;
    moxnesY = Math.floor(Math.random() * 400);
    //Først tilbakestiller jeg posisjonen til player og til moxnes. Han er delvis tilfeldig denne gangen og
    document.getElementById("level").innerHTML = " level " + level + ".";
    if (sjekkVinn === true) { //Hvis spilleren klarer det går spilleren til neste level, da beveger også moxnes seg fortere

        if (level === 2) {
            vansklighetsgradTall = 1 + 0.5;
            document.getElementById("level").style.color = "lightcoral";
        }
        if (level === 3) {
            vansklighetsgradTall = vansklighetsgradTall + 0.25;
            document.getElementById("level").style.color = "darkred";
        }
        if (level > 3) { //Utover level 3 blir det vanskligere, og det står hvilket nivå du er på.
            vansklighetsgradTall = vansklighetsgradTall + 0.1;
            document.getElementById("level").style.color = "red";
        }
    }
    else {
        if (level === 1) { //Hvis spilleren ikke klarer første level vil moxnes bevege seg saktere
            vansklighetsgradTall = vansklighetsgradTall - 0.1;
        }
    }

    console.log("Vansklighetsgradstall = " + vansklighetsgradTall);
}





