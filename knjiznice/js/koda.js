
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";


/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generirajPodatke(stPacienta, callback) { //callback(ehrId, napaka)
    var podatki = [{ime: "Zdravko", priimek: "Dren", drzava: "Slovenia", podatki: [
                        {datum: "2016-05-06T05:42Z", teza: 100.2, visina: 186},
                        {datum: "2016-05-05T20:55Z", teza: 46, visina: 186},
                        {datum: "2016-01-02T11:42Z", teza: 80, visina: 185},
                        {datum: "2016-01-02T11:40Z", teza: 80, visina: 185}
                   ]},
                   {ime: "John", priimek: "Doe", drzava: "United States of America", podatki: [
                        {datum: "2016-03-01T10:30Z", teza: 72.64, visina: 176},
                        {datum: "2016-02-01T10:30Z", teza: 69.93, visina: 154},
                        {datum: "2016-01-01T10:30Z", teza: 72.31, visina: 150}
                   ]},
                   {ime: "Chang", priimek: "Chong", drzava: "China", podatki: [
                        {datum: "2015-07-06T08:00Z", teza: 52, visina: 180},
                        {datum: "2015-03-04T16:30Z", teza: 60, visina: 180},
                        {datum: "2016-02-03T14:30Z", teza: 65, visina: 175}
                   ]}];

    var pacient = podatki[stPacienta-1];
    kreirajEHRzaBolnika(pacient.ime, pacient.priimek, pacient.drzava, function(ehrId, napaka1) {
        if(napaka1) {
            callback(null, napaka1);
        } else {
            var napaka2all = null;
            pacient.podatki.forEach(function(podatek) {
                vnesiPodatke(ehrId, podatek.datum, podatek.visina, podatek.teza, function(napaka2) {
                    if(napaka2) {
                        napaka2all = napaka2;
                    }
                });
            });
            callback(ehrId, napaka2all);
        }
    });
}

function ustvariTestnePodatke() {
    $("#generirajSporocilo").html("");
    var podatki = [];
    generirajPodatke(1, function(ehrId1, napaka1) {
        if(napaka1) {
            $("#generirajSporocilo").append("<span class='obvestilo label " +
              "label-danger fade-in'>Napaka pri ustvarjanju 1. pacienta: '" + napaka1 + "'!</span><br />");
        } else {
            $("#generirajSporocilo").append("<span class='obvestilo " +
              "label label-success fade-in'>Uspešno kreiran EHR pacienta 1: '" +
              ehrId1 + "'.</span><br />");
            podatki.push({ehr: ehrId1, vsebina: "Pacient 1"});
            generirajPodatke(2, function(ehrId2, napaka2) {
                if(napaka2) {
                    $("#generirajSporocilo").append("<span class='obvestilo label " +
                      "label-danger fade-in'>Napaka pri ustvarjanju 2. pacienta: '" + napaka2 + "'!</span><br />");
                } else {
                    $("#generirajSporocilo").append("<span class='obvestilo " +
                      "label label-success fade-in'>Uspešno kreiran EHR pacienta 2: '" +
                      ehrId2 + "'.</span><br />");
                    podatki.push({ehr: ehrId2, vsebina: "Pacient 2"});
                    generirajPodatke(3, function(ehrId3, napaka3) {
                        if(napaka3) {
                            $("#generirajSporocilo").append("<span class='obvestilo label " +
                              "label-danger fade-in'>Napaka pri ustvarjanju 3. pacienta: '" + napaka3 + "'!</span><br />");
                        } else {
                            $("#generirajSporocilo").append("<span class='obvestilo " +
                              "label label-success fade-in'>Uspešno kreiran EHR pacienta 3: '" +
                              ehrId3 + "'.</span><br />");
                            podatki.push({ehr: ehrId3, vsebina: "Pacient 3"});
                            populirajEHRje(podatki);
                            $("#generirajSporocilo").append("<span class='obvestilo label " +
                              "label-warning fade-in'>EHRId-ji so dodani v dropdown sezname!</span>");
                        }
                    });
                }
            });
        }
    });

    return false;
}

function kreirajEHRzaBolnika(ime, priimek, drzava, callback) { // callback(ehrId, napaka)
	sessionId = getSessionId();

	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
	    url: baseUrl + "/ehr",
	    type: 'POST',
	    success: function (data) {
	        var ehrId = data.ehrId;
	        var partyData = {
	            firstNames: ime,
	            lastNames: priimek,
	            partyAdditionalInfo: [{key: "drzava", value: drzava}, {key: "ehrId", value: ehrId}]
	        };
	        $.ajax({
	            url: baseUrl + "/demographics/party",
	            type: 'POST',
	            contentType: 'application/json',
	            data: JSON.stringify(partyData),
	            success: function (party) {
	                if (party.action == 'CREATE') {
	                    callback(ehrId, null);
	                }
	            },
	            error: function(err) {
	            	callback(null, JSON.parse(err.responseText).userMessage);
	            }
	        });
	    }
	});
}

function vnesiPodatke(ehrId, datumInUra, telesnaVisina, telesnaTeza, callback) { //callback(napaka)
	sessionId = getSessionId();

	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	var podatki = {
		// Struktura predloge je na voljo na naslednjem spletnem naslovu:
        // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
	    "ctx/language": "en",
	    "ctx/territory": "SI",
	    "ctx/time": datumInUra,
	    "vital_signs/height_length/any_event/body_height_length": telesnaVisina,
	    "vital_signs/body_weight/any_event/body_weight": telesnaTeza
	};
	var parametriZahteve = {
	    ehrId: ehrId,
	    templateId: 'Vital Signs',
	    format: 'FLAT'
	};
	$.ajax({
	    url: baseUrl + "/composition?" + $.param(parametriZahteve),
	    type: 'POST',
	    contentType: 'application/json',
	    data: JSON.stringify(podatki),
	    success: function (res) {
	        callback(null);
	    },
	    error: function(err) {
	    	callback(JSON.parse(err.responseText).userMessage);
	    }
	});
}

function kreirajNovZapis() {
    $("#kreirajSporocilo").html("");

	var ime = $("#kreirajIme").val();
	var priimek = $("#kreirajPriimek").val();
	var drzava = $("#kreirajDrzava").val();

	if (!ime || !priimek || !drzava || ime.trim().length == 0 ||
      priimek.trim().length == 0 || drzava.trim().length == 0) {
		$("#kreirajSporocilo").html("<span class='obvestilo label " +
          "label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
        kreirajEHRzaBolnika(ime, priimek, drzava, function(ehrId, napaka) {
            if(napaka) {
                $("#kreirajSporocilo").html("<span class='obvestilo label " +
                  "label-danger fade-in'>Napaka: '" + napaka + "'!</span>");
            } else {
                $("#kreirajSporocilo").html("<span class='obvestilo " +
                  "label label-success fade-in'>Uspešno kreiran EHR '" +
                  ehrId + "'.</span>");
            }
        });
    }
}

function vrniItmDrzav(callback) {
    var response = $.ajax({
        type: "POST",
        dataType: "jsonp",
        url: "http://apps.who.int/gho/athena/data/GHO/NCD_BMI_MEAN.json?profile=simple&filter=AGEGROUP:*;SEX:*;COUNTRY:*",
        async: false,

        success: function(response) {
            var vrstice = [];
            response.fact.forEach(function(data) {
                if(data.dim.SEX == "Both sexes" && value != "No data") {
                    var value = data.Value.split(" ")[0];
                    var vpis = true;
                    vrstice.forEach(function(vrstica) {
                        if(vrstica.drzava == data.dim.COUNTRY) {
                            if(vrstica.leto < data.dim.YEAR) {
                                vrstica.itm = value;
                                vrstica.leto = data.dim.YEAR;
                            }
                            vpis = false;
                        }
                    });
                    if(vpis)
                        vrstice.push({drzava: data.dim.COUNTRY, itm: value, leto: data.dim.YEAR});
                }
            });
            // sort
            vrstice.sort(function(a, b) {
                return a.drzava < b.drzava ? -1 : 1;
            });
            //console.log(vrstice);
            callback(vrstice);
        },

        error: function() {
            callback(null);
        }
    });
}

function vnesiPodatkeBolnika() {
    $("#vnosSporocilo").html("");

	var ehrId = $("#vnosEHR").val();
	var datumInUra = $("#vnosDatumInUra").val();
	var telesnaVisina = $("#vnosTelesnaVisina").val();
	var telesnaTeza = $("#vnosTelesnaTeza").val();

	if (!ehrId || !datumInUra || !telesnaTeza || !telesnaVisina ||
      ehrId.trim().length == 0 || datumInUra.trim().length == 0 ||
      telesnaVisina.trim().length == 0 || telesnaTeza.trim().length == 0) {
		$("#vnosSporocilo").html("<span class='obvestilo " +
          "label label-warning fade-in'>Prosim vnesite vse podatke!</span>");
	} else {
        vnesiPodatke(ehrId, datumInUra, telesnaVisina, telesnaTeza, function(napaka) {
            if(napaka) {
                $("#vnosSporocilo").html(
                  "<span class='obvestilo label label-danger fade-in'>Napaka: '" +
                  napaka + "'!</span>");
            } else {
                $("#vnosSporocilo").html(
                  "<span class='obvestilo label label-success fade-in'>Vnos uspešen!</span>");
            }
        });
    }
}

function pregled() {
    $("#pregledRezultati").slideUp();
    $("#pregledITM").html("Izberi datum pregleda na desni.");
    $("#legendaITM tbody").children().removeClass("info");

    $("#pregledSporocilo").html("");

	sessionId = getSessionId();

	var ehrId = $("#pregledEHR").val();

	if (!ehrId || ehrId.trim().length == 0) {
		$("#pregledSporocilo").html("<span class='obvestilo label label-warning " +
          "fade-in'>Prosim vnesite zahtevan podatek!");
	} else {
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function(data) {
				var party = data.party;

                vrniPodatke(ehrId, function(vrstice) {
                    if(vrstice == null) {
                        $("#pregledDatum").html("<option>Napaka pri pridobivanju podatkov!</option>");
                    } else if(vrstice.length == 0) {
                        $("#pregledDatum").html("<option>Ni podatkov!</option>");
                    } else {
                        $("#pregledDatum").html("<option></option>");
                        vrstice.forEach(function(vrstica) {
                            $("#pregledDatum").append("<option value='" + vrstica.itm.toFixed(2) + "'>" + vrstica.datum +
                              " (" + vrstica.masa + "kg, " + vrstica.visina + "cm)</option>");
                        });
                    }

                    var drzava = null;
                    party.partyAdditionalInfo.forEach(function(info) {
                        if(info.key == "drzava") {
                            drzava = info.value;
                        }
                    });
                    if(drzava == null) {
                        $("#pregledSporocilo").html("<span class='obvestilo label " +
                          "label-danger fade-in'>Napaka pri pridobivanju države uporabnika.</span>");
                    } else {
                        vrniItmDrzav(function(vrstice) {
                            if(vrstice == null) {
                                $("#pregledSporocilo").html("<span class='obvestilo label " +
                                  "label-danger fade-in'>Napaka pri pridobivanju povprečja držav.</span>");
                            } else {
                                var povp = null;
                                var leto = null;
                                vrstice.forEach(function(vrstica) {
                                    if(vrstica.drzava == drzava) {
                                        povp = vrstica.itm;
                                        leto = vrstica.leto;
                                    }
                                });
                                if(povp == null || leto == null) {
                                    $("#pregledSporocilo").html("<span class='obvestilo label " +
                                      "label-danger fade-in'>Napaka: Država uporabnika ni v podatkovni bazi.</span>");
                                } else {
                                    $("#pregledImeInPriimek").text(party.firstNames + " " + party.lastNames);
                                    $("#pregledDrzava").text(drzava);
                                    $("#pregledLeto").text(leto);
                                    $("#pregledPovp").text(povp);

                                    $("#pregledRezultati").slideDown();
                                }
                            }
                        });
                    }
                })
			},
			error: function(err) {
				$("#pregledSporocilo").html("<span class='obvestilo label " +
                  "label-danger fade-in'>Napaka '" +
                  JSON.parse(err.responseText).userMessage + "'!</span>");
			}
		});
	}
}

function vrniPodatke(ehrId, callback) {
	sessionId = getSessionId();

    $.ajax({
        url: baseUrl + "/view/" + ehrId + "/" + "height",
        type: 'GET',
        headers: {"Ehr-Session": sessionId},
        success: function (visine) {
            $.ajax({
                url: baseUrl + "/view/" + ehrId + "/" + "weight",
                type: 'GET',
                headers: {"Ehr-Session": sessionId},
                success: function (mase) {
                    var vrstice = [];
                    visine.forEach(function(visina) {
                        mase.forEach(function(masa) {
                            if(visina.time == masa.time) {
                                var visinaMetri = visina.height / 100;
                                var itm = masa.weight / (visinaMetri * visinaMetri);
                                vrstice.push({datum: visina.time,
                                  visina: visina.height, masa: masa.weight, itm: itm});
                            }
                        });
                    });
                    callback(vrstice);
                },
                error: function() {
                    callback(null);
                }
            });
        },
        error: function() {
            callback(null);
        }
    });
}

function prikaziStatistiko() {
    $("#statistikaRezultati").slideUp();
    $("#statistikaGraf").html("");

    $("#statistikaSporocilo").html("");

    var ehrId = $("#statistikaEHR").val();

	if (!ehrId || ehrId.trim().length == 0) {
		$("#statistikaSporocilo").html("<span class='obvestilo label label-warning " +
          "fade-in'>Prosim vnesite zahtevan podatek!");
	} else {
        vrniItmDrzav(function(vrsticeDrzav) {
            vrniPodatke(ehrId, function(vrsticeUporabnika) {
                if(vrsticeDrzav == null) {
                    $("#statistikaSporocilo").html("<span class='obvestilo label " +
                      "label-danger fade-in'>Napaka pri pridobivanju podatkov zunanjega vira!</span>");
                } else if(vrsticeUporabnika == null) {
                    $("#statistikaSporocilo").html("<span class='obvestilo label " +
                      "label-danger fade-in'>Napaka pri pridobivanju podatkov iz EHR baze!</span>");
                } else {
                    $.ajax({
            			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
            			type: 'GET',
            			headers: {"Ehr-Session": sessionId},
            	    	success: function(data) {
            				var party = data.party;
                            var drzavaUporabnika = null;
                            party.partyAdditionalInfo.forEach(function(info) {
                                if(info.key == "drzava") {
                                    drzavaUporabnika = info.value;
                                }
                            });
                            if(drzavaUporabnika == null) {
                                $("#pregledSporocilo").html("<span class='obvestilo label " +
                                  "label-danger fade-in'>Napaka pri pridobivanju države uporabnika.</span>");
                            } else {
                                var disp = [];
                                vrsticeDrzav.forEach(function(vrsticaD) {
                                    var itm_corrected = (vrsticaD.itm - 10) * (100000 - 100) / (40 - 10) + 100; //za izris
                                    var cluster = vrsticaD.drzava.substring(0, 1);
                                    if(vrsticaD.drzava == drzavaUporabnika) {
                                        cluster = "__user-drzava";
                                        vrsticeUporabnika.forEach(function(vrsticaU) {
                                            var itm_corrected_u = (vrsticaU.itm - 10) * (100000 - 100) / (40 - 10) + 100; //za izris
                                            if(itm_corrected_u > 0) { // itm je vecji od 10, ce ni ga ne prikazi
                                                disp.push({className: party.firstNames + " " + party.lastNames,
                                                  packageName: "__user",
                                                  value: itm_corrected_u, itm: vrsticaU.itm.toFixed(2), datum: vrsticaU.datum});
                                            }
                                        });
                                    }
                                    disp.push({className: vrsticaD.drzava, packageName: cluster,
                                      value: itm_corrected, itm: vrsticaD.itm, datum: vrsticaD.leto});
                                });

                                var diameter = 960,
                                    format = d3.format(",d"),
                                    color = d3.scale.category20c();

                                var bubble = d3.layout.pack()
                                    .sort(null)
                                    .size([diameter, diameter])
                                    .padding(1.5);

                                var svg = d3.select("#statistikaGraf").append("svg")
                                    .attr("width", diameter)
                                    .attr("height", diameter)
                                    .attr("class", "bubble");

                                root = {children: disp};

                                var node = svg.selectAll(".node")
                                    .data(bubble.nodes(root)
                                    .filter(function(d) { return !d.children; }))
                                    .enter().append("g")
                                    .attr("class", "node")
                                    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

                                node.append("title")
                                    .text(function(d) { return d.className + " (" + d.datum + "): " + d.itm; });

                                node.append("circle")
                                    .attr("r", function(d) { return d.r; })
                                    .style("fill", function(d) {
                                        if(d.packageName.startsWith("__user")) {
                                            return "BFC722";
                                        }
                                        return color(d.packageName);
                                    });

                                node.append("text")
                                    .attr("dy", ".3em")
                                    .style("text-anchor", "middle")
                                    .text(function(d) { return d.className.substring(0, d.r / 3); });

                                d3.select(self.frameElement).style("height", diameter + "px");

                                $("#statistikaRezultati").slideDown();
                            }
                        },

                        error: function(err) {
            				$("#statistikaSporocilo").html("<span class='obvestilo label " +
                              "label-danger fade-in'>Napaka '" +
                              JSON.parse(err.responseText).userMessage + "'!</span>");
            			}
            		});
                }
            });
        });
    }
}

function populirajEHRje(podatki) {
    $("#pregledDropdown").html("<option value=''></option>");
    $("#statistikaDropdown").html("<option value=''></option>");
    podatki.forEach(function(podatek) {
        var opt = "<option value='" + podatek.ehr + "'>" + podatek.vsebina + "</option>";
        $("#pregledDropdown").append(opt);
        $("#statistikaDropdown").append(opt);
    });
}

$(document).ready(function() {
    // populiraj drop down list za drzave
    vrniItmDrzav(function(vrstice) {
        if(vrstice == null) {
            $("#kreirajDrzava").append("<option>Napaka pri pridobivanju držav. Prosimo, osvežite stran!</option>");
        } else {
            vrstice.forEach(function(vrstica) {
                $("#kreirajDrzava").append("<option>" + vrstica.drzava + "</option>");
            });
        }
    });
    
    $("#pregledRezultati").hide();

    $("#pregledDatum").change(function() {
        if($(this).val() == null || $(this).val() == "") {
            $("#pregledITM").html("Izberi datum pregleda na desni.");
            $("#legendaITM tbody").children().removeClass("info");
        } else {
            var itm = $(this).val();
            $("#pregledITM").html(itm);
            $("#legendaITM tbody").children().removeClass("info");
            $("#legendaITM tbody").children().each(function() {
                var minmax = $(this).data("minmax").split("|");
                var min = minmax[0];
                var max = minmax[1];
                if(itm > min && itm <= max) {
                    $(this).addClass("info");
                }
            });
        }
    });
    
    $("#statistikaRezultati").hide();
    
    //populiraj drop down z ehrId-ji
    var podatki = [{ehr: "668e4b6c-9519-4ac1-b88c-b6a361850517", vsebina: "Zdravko Dren"},
                   {ehr: "3675100c-be43-482a-95d7-567fbe0af9b2", vsebina: "John Doe"},
                   {ehr: "18c879da-9db0-4d04-8519-1882101e8016", vsebina: "Chang Chong"}];
    populirajEHRje(podatki);

    $("#pregledDropdown").change(function() {
        $("#pregledEHR").val($(this).val());
    });
    $("#statistikaDropdown").change(function() {
        $("#statistikaEHR").val($(this).val());
    });
});
