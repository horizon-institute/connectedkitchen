// https://lancaster-university.github.io/microbit-docs/resources/bluetooth/bluetooth_profile.html
// An implementation of Nordic Semicondutor's UART/Serial Port Emulation over Bluetooth low energy
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

// Allows the micro:bit to transmit a byte array
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// Allows a connected client to send a byte array
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let uBitDevice;
let rxCharacteristic;

function setup() {
  const connectButton = createButton("Connect");
  connectButton.mousePressed(connectButtonPressed);

  const disconnectButton = createButton("Disconnect");
  disconnectButton.mousePressed(disconnectButtonPressed);

  const pingButton = createButton("Ping");
  pingButton.mousePressed(pingButtonPressed);
}


const WIDTH = 1000;
const PRESSUREHEIGHT = 400;
const ACCHEIGHT = 200;
const MAXVALUES = 40;
const BASELINE = 460;
const MAXPRESSURE = 1023;

async function connectButtonPressed() {
  try {
    console.log("Requesting Bluetooth Device...");
    uBitDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Feather nRF52840 Sense"}],
      optionalServices: [UART_SERVICE_UUID]
    });

    console.log("Connecting to GATT Server...");
    const server = await uBitDevice.gatt.connect();

    console.log("Getting Service...");
    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    rxCharacteristic =  service.getCharacteristic(
      UART_RX_CHARACTERISTIC_UUID
    ).then((characteristic)=>{
        
        const pressuresvg = d3.select("body").append("svg").attr("id", "pressure").attr('width',1000).attr("height", PRESSUREHEIGHT);
        const accelerometersvg = d3.select("body").append("svg").attr("id", "accelerometer").attr('width',1000).attr("height", ACCHEIGHT);
        var colour = d3.scaleSequential(d3.interpolateViridis).domain([0, MAXPRESSURE-BASELINE]);
        let data = [];
       
        return characteristic.startNotifications()
        .then(char => {
          characteristic.addEventListener('characteristicvaluechanged',
                (event)=>{
                    
                    const ts = Date.now();
                    const dv = event.target.value;
                    const arr = new Uint8Array(dv.buffer)
                    var string = new TextDecoder().decode(arr);
                    const toks = string.split(" ");
                    const [xa, ya, za, xg, yg, zg, pressure, proximity] = toks;
                    
                    data.push({ts, pressure: Number(pressure)-BASELINE, proximity:Number(proximity), acceleration:[Number(xa),Number(ya),Number(za)], gyro:[Number(xg), Number(yg), Number(zg)]});
                  
                    
                    if (data.length > MAXVALUES){
                        [item, ...data] = data;
                    }

                    const tsx  = d3.scaleTime().domain(d3.extent(data, d=>d.ts)).range([ 0, WIDTH ]);                    
                    const acc = d3.scaleLinear().domain([-30, 30]).range([ ACCHEIGHT, 0 ]);
                    const px = d3.scaleLinear().domain([0, MAXPRESSURE-BASELINE]).range([0, PRESSUREHEIGHT]);

                    const pressurec = pressuresvg.selectAll("rect").data(data, d=>d.ts)  
                    const BARWIDTH = (WIDTH/MAXVALUES) - 1;

                    const renderPressure = ()=>{
                      pressurec.enter()  // Returns placeholders for our missing elements
                      .append("rect")  // Creates the new rectangles
                      .attr("x", (d, i)=> tsx(d.ts))
                      .attr("y", (d, i)=> d.pressure > 0 ?  PRESSUREHEIGHT-px(d.pressure) : px(MAXPRESSURE))//d.pressure <= 0 ? PRESSUREHEIGHT - 1023 : PRESSUREHEIGHT - (d.pressure))
                      .attr("rx",4)
                      .attr("ry",4)
                      .attr("width", BARWIDTH)
                      .attr("height", (d)=> d.pressure > 0 ? px(d.pressure) : MAXPRESSURE)
                      .style("fill", d=> colour(d.pressure))//d.pressure > (MAXPRESSURE-BASELINE-200) ? d.pressure > (MAXPRESSURE-BASELINE-100) ? "red"  : "orange": "steelblue")
                      .style("opacity", d=> d.pressure <= 0 ? 0.1 : 1)

                       pressurec.attr("x", (d, i)=> tsx(d.ts))
                       pressurec.exit().remove()
                    }
                    
                    
                    const renderAccelerometer = ()=>{
                      const linefn =  d3.line().curve(d3.curveBasis).x(d=>tsx(d.ts)).y(d=>acc(d.value));
                   
                    
                      const xdata = [data.map(d=>({value:d.acceleration[0], ts:d.ts}))];
                      const ydata = [data.map(d=>({value:d.acceleration[1], ts:d.ts}))];
                      const zdata = [data.map(d=>({value:d.acceleration[2], ts:d.ts}))];
                      
                      const accelXchart = accelerometersvg.selectAll("path#x").data(xdata)
                    
                      accelXchart.enter().append("path")
                        .attr("d", d=>linefn(d))
                        .attr("id", "x")
                        .attr("fill", "none")
                        .attr("stroke", "steelblue")
                        .attr("stroke-width", 1.5);
                      
                      accelXchart.attr("d",d=>linefn(d))
                      
                      const accelYchart = accelerometersvg.selectAll("path#y").data(ydata)
                     
                      accelYchart.enter().append("path")
                        .attr("d", d=>linefn(d))
                        .attr("id", "y")
                        .attr("fill", "none")
                        .attr("stroke", "red")
                        .attr("stroke-width", 1.5);
                      
                      accelYchart.attr("d",d=>linefn(d))
  
                      const accelZchart = accelerometersvg.selectAll("path#z").data(zdata)
                     
                      accelZchart.enter().append("path")
                        .attr("d", d=>linefn(d))
                        .attr("id", "z")
                        .attr("fill", "none")
                        .attr("stroke", "green")
                        .attr("stroke-width", 1.5);
                      
                      accelZchart.attr("d",d=>linefn(d))
                    }

                    renderPressure();               
                    renderAccelerometer();
            });
        });

       
    
    }),

  
    //rxCharacteristic.addEventListener("characteristicvaluechanged", onTxCharacteristicValueChanged);
    console.log(rxCharacteristic);
    //console.log("here3!");
  } catch (error) {
    console.log(error);
  }
}

function disconnectButtonPressed() {
  if (!uBitDevice) {
    return;
  }

  if (uBitDevice.gatt.connected) {
    uBitDevice.gatt.disconnect();
    console.log("Disconnected");
  }
}

async function pingButtonPressed() {
  if (!rxCharacteristic) {
    return;
  }

  try {
    let encoder = new TextEncoder();
    rxCharacteristic.writeValue(encoder.encode("P\n"));
  } catch (error) {
    console.log(error);
  }
}
