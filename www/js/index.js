//Based on the default Cordova template. Fencing Agent logic is to be found in fencing_agent.js
var app = {
    geodomainTracker: {},

    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);

    },

    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        var currentLightbulbInterval = undefined;

        app.geodomainTracker =  new GeodomainTracker(
                function(geodomains) {
                    var geodomainUl = document.getElementById("geodomainListing");
                    while(geodomainUl.firstChild) {
                        geodomainUl.removeChild(geodomainUl.firstChild);
                    }

                    for(var i = 0; i < geodomains.length; i++) {
                        (function(i) {
                            var geodomain = geodomains[i];

                            var geodomainLi = document.createElement("li");
                            var geodomainRemovalButton = document.createElement("button");
                            var geodomainText = document.createTextNode(geodomain + " ");
                            geodomainRemovalButton.onclick = function() {
                                app.geodomainTracker.removeGeodomain(geodomain);
                            };
                            geodomainRemovalButton.innerHTML = "Remove";

                            geodomainLi.appendChild(geodomainText);
                            geodomainLi.appendChild(geodomainRemovalButton);

                            geodomainUl.appendChild(geodomainLi);
                        })(i);
                    }

                    var newGeodomainLi = document.createElement("li");
                    var newGeodomainTextbox = document.createElement("input");
                    var addGeodomainButton = document.createElement("button");
                    newGeodomainTextbox.type = "text";
                    addGeodomainButton.innerHTML = "Add";
                    addGeodomainButton.onclick = function(e) {
                        app.geodomainTracker.addGeodomain(newGeodomainTextbox.value);
                        addGeodomainButton.disabled = true;
                        newGeodomainTextbox.disabled = true;
                    };


                    newGeodomainLi.appendChild(newGeodomainTextbox);
                    newGeodomainLi.appendChild(addGeodomainButton);

                    geodomainUl.appendChild(newGeodomainLi);


                }, function(colors) {
                    var currentScheduledColorChanges = [];
                    var clearScheduledChanges = function() {
                        //Ensure that the previous second's colors don't run long.
                        for(var i = 0; i < currentScheduledColorChanges.length; i++) {
                            clearTimeout(currentScheduledColorChanges[i]);
                            currentScheduledColorChanges.splice(i,1);
                        }
                    };

                    var planLightbulbSecond = function() {
                        clearScheduledChanges();

                        var colorTime = Math.floor(1000/colors.length);//whole milliseconds. Last color may be about one millisecond longer than it's supposed to be.
                        var bulbOverlay = document.getElementById("bulb_overlay");
                        if(colors.length < 1) {
                            bulbOverlay.style.opacity = 0;
                        } else {
                            bulbOverlay.style.opacity = 0.3;
                        }
                        var NS = "http://www.w3.org/2000/svg";
                        for(var i = 0; i < colors.length; i++) {
                            (function(i) {
                                var newColor = colors[i];
                                currentScheduledColorChanges.push(setTimeout(function() {
                                    bulbOverlay.style.background = newColor;

                                }, colorTime*i));
                            })(i);
                        }
                    } 

                    clearScheduledChanges();
                    clearInterval(currentLightbulbInterval);
                    currentLightbulbInterval = setInterval(planLightbulbSecond, 1000);
                },
                window.plugins.fencingAgent.FencingAgent,
                window.plugins.fencingAgent.FencingAgentDelegate,
                window.plugins.fencingAgent.FencingAgentProfile
        );
        app.geodomainTracker.updateDisplay();
    },

    receivedEvent: function(id) {
       document.getElementById("switchPageButton").onclick = app.switchActivePage;
    },
    switchActivePage: function() {
        var lightbulbPage = document.getElementById("lightbulbPage");
        var settingsPage = document.getElementById("settingsPage");

        var lightbulbIsVisible = !lightbulbPage.classList.contains("hidden");
        if(lightbulbIsVisible) {
            settingsPage.classList.remove("hidden");
            lightbulbPage.classList.add("hidden");
        } else {
            settingsPage.classList.add("hidden");
            lightbulbPage.classList.remove("hidden");
        }
    }
};

app.initialize();
