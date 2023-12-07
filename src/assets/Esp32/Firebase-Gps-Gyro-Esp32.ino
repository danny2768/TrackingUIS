#include <Wire.h>
#include <WiFi.h>
#include <FirebaseESP32.h> // https://github.com/mobizt/Firebase-ESP32
#include <TinyGPS++.h> // Libreria para el GPS https://github.com/neosarchizo/TinyGPS
#include <L3G.h> // Libreria Giroscopio https://github.com/pololu/l3g-arduino

TinyGPSPlus gps;
L3G gyro;

// GPS pins
#define RXD2 16
#define TXD2 17

// Gyroscope pins - ESP32 RX & TX

HardwareSerial neogps(1);
char   datoCmd = 0;
#define NMEA 0 // Trama cruda NMEA

// Wifi Setup
// #define WIFI_SSID "MARTHA_L"
// #define WIFI_PASSWORD "aries6827"
#define WIFI_SSID "GalaxyS20DEC"
#define WIFI_PASSWORD "DanielC27"


// Firebase config
# include  <addons/TokenHelper.h> // Proporciona la información del proceso de generación del token.
# include  <addons/RTDBHelper.h> // Proporciona la información de impresión de la carga útil RTDB y otras funciones auxiliares. 

#define API_KEY "AIzaSyCsowL4Y2MOvkC5L6YlA023k2msqKuNL3Y"
#define DATABASE_URL "https://gps-micro-default-rtdb.firebaseio.com/:null" 

// Credentials of a user registred in the dataBase
#define USER_EMAIL "gps@gmail.com"
#define USER_PASSWORD "Gps.1234"

FirebaseData fbdo;
FirebaseData stream;

FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
String uid;

String parentPath = "/gpsData";
String childPath[2] = {"/node1", "/node2"};

// GPS var
float longitud;
float latitud;
String fecha;
String hora;

// Gyroscope var
bool accident = false;

// FireBase helper methods
void streamCallback(MultiPathStreamData stream){
  
  size_t numChild = sizeof(childPath) / sizeof(childPath[0]);

  for (size_t i = 0; i < numChild; i++)
  {
    if (stream.get(childPath[i]))
    {
      Serial.printf("path: %s, event: %s, type: %s, value: %s%s", stream.dataPath.c_str(), stream.eventType.c_str(), stream.type.c_str(), stream.value.c_str(), i < numChild - 1 ? "\n" : "");
    }
  }

  Serial.println();
  Serial.printf("Received stream payload size: %d (Max. %d)\n\n", stream.payloadLength(), stream.maxPayloadLength());
}

void streamTimeoutCallback(bool timeout){
  
  if (timeout)
    Serial.println("stream timed out, resuming...\n");
  if (!stream.httpConnected())
    Serial.printf("error code: %d, reason: %s\n\n", stream.httpCode(), stream.errorReason().c_str());
}

// SetUp
void setup() {  
  Wire.begin();
  Serial.begin(115200); // Init ESP32
  neogps.begin(9600, SERIAL_8N1, RXD2, TXD2); // Init GPS
  // Init Gyroscope
  if (!gyro.init())
  {
    Serial.println("Failed to autodetect gyro type!");
    while (1);
  }
  gyro.enableDefault();
  
  // Wifi SetUp
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connectado a Wi-Fi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Conectado con la IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  
  // Firebase setup
  Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.database_url = DATABASE_URL;

  /* Assign the callback function for the long running token generation task */
  config.token_status_callback = tokenStatusCallback; // see addons/TokenHelper.h
  // To connect without auth in Test Mode, see Authentications/TestMode/TestMode.ino
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  if (!Firebase.beginMultiPathStream(stream, parentPath)){
    Serial.printf("sream begin error, %s\n\n", stream.errorReason().c_str());
  }
  Firebase.setMultiPathStreamCallback(stream, streamCallback, streamTimeoutCallback);

  // Getting the user UID might take a few seconds
  Serial.println("Getting User UID");
  while ((auth.token.uid) == "") {
    Serial.print('.');
    delay(1000);
  }
  // Print user UID
  uid = auth.token.uid.c_str();
  Serial.print("User UID: ");
  Serial.println(uid);
}

void loop(){
  // Firebase.ready() should be called repeatedly to handle authentication tasks.
  if ( Firebase.ready() && (millis() - sendDataPrevMillis > 5000 || sendDataPrevMillis == 0) ){
    sendDataPrevMillis = millis();
    Serial.print("\nSet json...");

    // Read Gyroscope 
    gyro.read();
    int x_value = (int)gyro.g.x;
    int y_value = (int)gyro.g.y;

    // handle data
    boolean newData = false;
    accident = false;
    for (unsigned long start = millis(); millis() - start < 1000;){
      while ( neogps.available() ){
        if ( gps.encode(neogps.read()) ){
          newData = true;
        }
      }
    }

    if ( newData == true ){
      newData = false; 
      newDataInf();
      sendDataFirebase();
    }

    if (x_value < -10000 || x_value > 10000 || y_value < -10000 || y_value > 10000) {
      accident = true;
      getGpsData();
      sendDataFirebase();
    }
  }
  printDataSerial();
  delay(500);
}

void newDataInf(){
  getGpsData();
  getGyroscopeData();
}


void getGpsData(){
  latitud = gps.location.lat();
  longitud = gps.location.lng();

  // get Date
  char bufferf[9];  // Se reserva un espacio para "HH:MM:SS" y el carácter nulo '\0'
  // Se utiliza snprintf para formatear los valores en la cadena de caracteres
  snprintf(bufferf, sizeof(bufferf), "%02d:%02d:%02d", gps.date.day(), gps.date.month(), gps.date.year());
  // Finalmente, se asigna el contenido del buffer a la variable "fecha"
  fecha = bufferf;

  // get Time
  char buffer[9];  // Se reserva un espacio para "HH:MM:SS" y el carácter nulo '\0'
  // Se utiliza snprintf para formatear los valores en la cadena de caracteres
  snprintf(buffer, sizeof(buffer), "%02d:%02d:%02d", gps.time.hour(), gps.time.minute(), gps.time.second());
  // Finalmente, se asigna el contenido del buffer a la variable "hora"
  hora = buffer;
}

void getGyroscopeData(){
    gyro.read();
    int x_value = (int)gyro.g.x;
    int y_value = (int)gyro.g.y;
    if (x_value < -10000 || x_value > 10000 || y_value < -10000 || y_value > 10000) {
      accident = true;
    }
}

void sendDataFirebase(){
  FirebaseJson json;

  json.set("/Latitude", latitud);
  json.set("/Longitude", longitud);
  json.set("/Date", fecha);
  json.set("/Time", hora);
  json.set("/Accident", accident);
  Serial.println(gps.satellites.value()); 
     
  //Visualizacion_Serial();
  String path = "/users/"+uid;
  Firebase.setJSONAsync(fbdo, path.c_str(), json);
}

void printDataSerial(){
  Serial.print("Lat: ");
  Serial.println(gps.location.lat(),6);

  Serial.print("Lng: ");
  Serial.println(gps.location.lng(),6);

  Serial.print("Date: ");
  Serial.print(gps.date.day()); Serial.print("/");
  Serial.print(gps.date.month()); Serial.print("/");
  Serial.println(gps.date.year());      

  Serial.print("Hour: ");
  Serial.print(gps.time.hour()); Serial.print(":");
  Serial.print(gps.time.minute()); Serial.print(":");
  Serial.println(gps.time.second());

  Serial.print("Accident: ");
  Serial.println(accident);
  Serial.println("---------------------------");  
}