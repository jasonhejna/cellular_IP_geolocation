/************************************************************
MG2639_GPRS_Client.h
MG2639 Cellular Shield library - GPRS TCP Client Example
Jim Lindblom @ SparkFun Electronics
Original Creation Date: April 3, 2015
https://github.com/sparkfun/MG2639_Cellular_Shield

This example demonstrates some of the simple information-
getting functions in the SparkFun MG2639 Cellular Shield
library.

Demonstrated functions include:
  cell.begin() - Initialize the cell shield
  cell.getInformation(manufacturer) - Get manufacturer,
    hardware, and software information of the module.
  cell.getIMI(imi) - Get IMI of module
  cell.getICCID(iccid) - Get ICCID of SIM card
  cell.getPhoneNumber(myPhone) - Get SIM cards phone number

Development environment specifics:
  IDE: Arduino 1.6.3
  Hardware Platform: Arduino Uno
  MG2639 Cellular Shield Version: 1.0

This code is beerware; if you see me (or any other SparkFun 
employee) at the local, and you've found our code helpful, 
please buy us a round!

Distributed as-is; no warranty is given.
************************************************************/
// The SparkFun MG2639 Cellular Shield uses Software//Serial
// to communicate with the MG2639 module. Include that
// library first:
#include <SoftwareSerial.h>
// Include the MG2639 Cellular Shield library
#include <SFE_MG2639_CellShield.h>

IPAddress myIP; // IP address to store local IP
char *getRequestStart = "GET / HTTP/1.1\nHost: 54.88.179.111:8080\nConnection: keep-alive\nCache-Control: max-age=0\nAccept: text/html\nmessage-body: {\"device_id\":\"0123456789\",\"api_key\":\"9a8b7c6d5e4f3g2h1i\",\"local_ip\":\"";
char *getRequestEnd = "\"}\n\n";


// To define your destination server, you can either set the
// IP address explicitly:
IPAddress serverIP(54, 88, 179, 111);
// Or define the domain of the server and use DNS to look up
// the IP for you:
//const char server[] = "example.com";

void setup() 
{
  // USB //Serial connection is used to print the information
  // we find.
  Serial.begin(9600);
  
  // //SerialTrigger() halts execution of the program until
  // any value is received over the //Serial link. Cell data
  // costs $, so we don't want to use it unless it's visible!
  //delay(7000);

  


  //Serial.write(final);
  //Serial.println(F("final actual"));
  
  
}

void loop()
{
  // gprs.available() returns the number of bytes available
  // sent back from the server. If it's 0 there is no data
  // available.
  /*if (gprs.available())
  {
    // gprs.read() can be called to read the oldest data
    // available in the module's FIFO.
    //Serial.write(gprs.read()); 
  }*/

  delay(1500);

  perform_request();

  delay(120000);
  
}

void perform_request()
{
  
  // Call cell.begin() to turn the module on and verify
  // communication.
  int beginStatus = cell.begin();
  if (beginStatus <= 0)
  {
    //Serial.println(F("Unable to communicate with shield. Looping"));
    while(1)
      ;
  }

  // gprs.open() enables GPRS. This function should be called
  // before doing any TCP stuff. It should only be necessary 
  // to call this function once.
  // gprs.open() can take up to 30 seconds to successfully
  // return. It'll return a positive value upon success.
  int openStatus = gprs.open();
  if (openStatus <= 0)
  {
    //Serial.println(F("Unable to open GPRS. Looping"));
    while (1)
      ;
  }
  
  // gprs.status() returns the current GPRS connection status.
  // This function will either return a 1 if a connection is
  // established, or a 0 if the module is disconnected.
  int GPRSStatus = gprs.status();
  if (GPRSStatus <= 0){
    while (1);
  }
  
  // gprs.localIP() gets and returns the local IP address 
  // assigned to the MG2639 during this session.
  myIP = gprs.localIP();
  char myIPString[16];
  sprintf(myIPString, "%d.%d.%d.%d\0", myIP[0], myIP[1], myIP[2], myIP[3]);
  Serial.print(F("My IP address is: "));
  Serial.println(myIPString);
  
  char *finalReq = (char *) malloc(1 + strlen(getRequestStart) + strlen(myIPString) + strlen(getRequestEnd) );
  strcpy(finalReq, getRequestStart);
  strcat(finalReq, myIPString);
  strcat(finalReq, getRequestEnd);
  
  // gprsHostByName(char * domain, IPAddress * ipRet) looks
  // up the DNS value of a domain name. The pertinent return
  // value is passed back by reference in the second 
  // parameter. The return value is an negative error code or
  // positive integer if successful.
  /*int DNSStatus = gprs.hostByName(server, &serverIP);
  if (DNSStatus <= 0)
  {
    //Serial.println(F("Couldn't find the server IP. Looping."));
    while (1)
      ;
  }
  //Serial.print(F("Server IP is: "));
  //Serial.println(serverIP);*/
  
  // gprs.connect(IPAddress remoteIP, port) establishes a TCP
  // connection to the desired host on the desired port.
  // We looked up serverIP in the previous step. Port 80 is
  // the standard HTTP port.
  int connectStatus = gprs.connect(serverIP, 8080);
  // a gprs.connect(char * domain, port) is also defined.
  // It takes care of the DNS lookup for you. For example:
  //gprs.connect(server, 80); // Connect to a domain
  if (connectStatus <= 0)
  {
    //Serial.println(F("Unable to connect. Looping."));
    while (1);
  }
 // Serial.println(F("Connected! Sending HTTP GET"));
  //Serial.println();
  
  // Time to send an HTTP request to the server we connected
  // to. gprs.print() and gprs.println() can be used to send
  // data of just about any variable type.
  
  // You can do this to send a GET string..
  /*gprs.println("GET / HTTP/1.1");
  gprs.print("Host: ");
  gprs.print(server);
  gprs.println();
  gprs.println();*/
  // ...but it's a whole lot faster if you do this:

  //sprintf(getRequest, "$d$d$d", getRequest, myIPString, endString);

  //Serial.print(F("Get Request: "));
  //Serial.println(getRequest);
  //char *ip = "127.0.0.1";
  //char *getRequest = "GET / HTTP/1.1\nHost: 54.88.179.111:8080\nConnection: keep-alive\nCache-Control: max-age=0\nAccept: text/html\nmessage-body: hello\n\n";
  gprs.print(finalReq);

  delay(8000);

  cell.powerOff();
}

