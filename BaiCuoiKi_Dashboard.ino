#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include <SPI.h>
#include <MFRC522.h>
#include <RTClib.h>

#define SS_PIN 10
#define RST_PIN 9
#define SERVO_PIN 2
#define BUZZER 6

#define IR_ENTRY 4
#define IR_EXIT 3

#define GATE_OPEN 0
#define GATE_CLOSE 100

// RFID UID
const String validUIDs[] = {
  "13 B1 2D 02",
  "F0 50 EB 5F",
  "B4 FF 4E 06",
  "43 E0 C3 13"
};
const int UID_COUNT = sizeof(validUIDs) / sizeof(validUIDs[0]);

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo gateServo;
RTC_DS3231 rtc;

// slot
const int MaxSlots = 4;
int Slot = MaxSlots;

// ve gui xe
struct ParkingTicket {
  String uid;
  uint32_t timeIn;
  bool active;
};

ParkingTicket tickets[MaxSlots];
String currentUID = "";

// BIEN CHONG NHAY LCD
int lastSecond = -1;

// BIEN GUI DU LIEU
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000; // Gui du lieu moi 2 giay

// coi
void beepOnce() {
  digitalWrite(BUZZER, HIGH);
  delay(150);
  digitalWrite(BUZZER, LOW);
}

//servo
void smoothOpenGate() {
  for (int p = GATE_CLOSE; p >= GATE_OPEN; p--) {
    gateServo.write(p);
    delay(10);
  }
}

void smoothCloseGate() {
  for (int p = GATE_OPEN; p <= GATE_CLOSE; p++) {
    gateServo.write(p);
    delay(10);
  }
}

// KIEM TRA THE DANG GUI XE
bool isCardActive(String uid) {
  for (int i = 0; i < MaxSlots; i++) {
    if (tickets[i].active && tickets[i].uid == uid) {
      return true;
    }
  }
  return false;
}

// GUI DU LIEU JSON QUA SERIAL
void sendDashboardData() {
  Serial.print("{");
  
  // Thong tin slot
  Serial.print("\"totalSlots\":");
  Serial.print(MaxSlots);
  Serial.print(",\"availableSlots\":");
  Serial.print(Slot);
  Serial.print(",\"occupiedSlots\":");
  Serial.print(MaxSlots - Slot);
  
  // Thoi gian
  DateTime now = rtc.now();
  Serial.print(",\"time\":\"");
  if (now.hour() < 10) Serial.print("0");
  Serial.print(now.hour());
  Serial.print(":");
  if (now.minute() < 10) Serial.print("0");
  Serial.print(now.minute());
  Serial.print(":");
  if (now.second() < 10) Serial.print("0");
  Serial.print(now.second());
  Serial.print("\",\"date\":\"");
  if (now.day() < 10) Serial.print("0");
  Serial.print(now.day());
  Serial.print("/");
  if (now.month() < 10) Serial.print("0");
  Serial.print(now.month());
  Serial.print("/");
  Serial.print(now.year());
  Serial.print("\"");
  
  // Danh sach xe dang gui
  Serial.print(",\"activeVehicles\":[");
  bool first = true;
  for (int i = 0; i < MaxSlots; i++) {
    if (tickets[i].active) {
      if (!first) Serial.print(",");
      Serial.print("{\"uid\":\"");
      Serial.print(tickets[i].uid);
      Serial.print("\",\"timeIn\":");
      Serial.print(tickets[i].timeIn);
      
      // Tinh thoi gian gui xe (phut)
      long minutes = (now.unixtime() - tickets[i].timeIn) / 60;
      Serial.print(",\"duration\":");
      Serial.print(minutes);
      Serial.print("}");
      first = false;
    }
  }
  Serial.print("]");
  
  Serial.println("}");
}

// GUI SU KIEN XE VAO/RA
void sendEvent(String action, String uid, int fee = 0, long duration = 0) {
  Serial.print("{\"event\":\"");
  Serial.print(action);
  Serial.print("\",\"uid\":\"");
  Serial.print(uid);
  Serial.print("\",\"fee\":");
  Serial.print(fee);
  if (duration > 0) {
    Serial.print(",\"duration\":");
    Serial.print(duration);
  }
  Serial.print(",\"timestamp\":");
  Serial.print(rtc.now().unixtime());
  Serial.println("}");
}

// RFID 
int rfunc() {
  lcd.clear();
  lcd.print("Quet the");

  unsigned long startTime = millis();
  while (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    if (millis() - startTime > 10000) { // Timeout 10s
      lcd.clear();
      return 0;
    }
    delay(200);
  }

  String ID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    ID += (rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    ID += String(rfid.uid.uidByte[i], HEX);
  }

  ID.toUpperCase();
  ID = ID.substring(1);
  currentUID = ID;

  for (int i = 0; i < UID_COUNT; i++) {
    if (ID == validUIDs[i]) {
      lcd.clear();
      lcd.print("The Hop Le");
      beepOnce();
      delay(800);
      return 1;
    }
  }

  lcd.clear();
  lcd.print("The Khong Hop Le ");
  delay(2000);
  lcd.clear();
  return 0;
}

void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();

  pinMode(IR_ENTRY, INPUT);
  pinMode(IR_EXIT, INPUT);
  pinMode(BUZZER, OUTPUT);

  gateServo.attach(SERVO_PIN);
  delay(300);
  gateServo.write(GATE_CLOSE);
  delay(500);

  SPI.begin();
  rfid.PCD_Init();

  if (!rtc.begin()) {
    lcd.print("Loi RTC");
    while (1);
  }

  rtc.adjust(DateTime(F(__DATE__), F(__TIME__))); // set gio

  for (int i = 0; i < MaxSlots; i++) {
    tickets[i].active = false;
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Nhom 1");
  lcd.setCursor(0, 1);
  lcd.print("Bai Do Xe");
  delay(3000);
  lcd.clear();
  
  // Gui thong bao khoi dong
  Serial.println("{\"status\":\"ready\"}");
}

void loop() {

  // ===== XE VAO =====
  if (digitalRead(IR_ENTRY) == LOW && Slot > 0) {

    int result = rfunc();
    if (result != 1) return;   

    if (!isCardActive(currentUID)) {

      uint32_t nowTime = rtc.now().unixtime();

      for (int i = 0; i < MaxSlots; i++) {
        if (!tickets[i].active) {
          tickets[i].uid = currentUID;
          tickets[i].timeIn = nowTime;
          tickets[i].active = true;
          break;
        }
      }

      smoothOpenGate();
      Slot--;

      // GUI SU KIEN XE VAO
      sendEvent("ENTRY", currentUID);
      sendDashboardData(); // Cap nhat ngay

      while (digitalRead(IR_EXIT) == HIGH);
      while (digitalRead(IR_EXIT) == LOW);

      smoothCloseGate();
    }
    else {
      lcd.clear();
      lcd.print("The Da Gui Xe");
      delay(2000);
      lcd.clear();
    }
  }

  // ===== XE RA =====
  if (digitalRead(IR_EXIT) == LOW && Slot < MaxSlots) {

    int result = rfunc();
    if (result != 1) return; 

    if (isCardActive(currentUID)) {

      uint32_t outTime = rtc.now().unixtime();
      int fee = 0;
      long minutes = 0;

      for (int i = 0; i < MaxSlots; i++) {
        if (tickets[i].active && tickets[i].uid == currentUID) {
          minutes = (outTime - tickets[i].timeIn) / 60;
          
          // Kiem tra thoi gian hop le
          if (minutes < 0) {
            minutes = 0; // Tranh truong hop loi thoi gian
          }
          
          // Phan loai thanh vien
          // 3 the thanh vien: 13 B1, F0 50, B4 FF
          // 1 the vang lai: 43 E0
          bool isMember = (currentUID.indexOf("13 B1") >= 0 || 
                          currentUID.indexOf("F0 50") >= 0 || 
                          currentUID.indexOf("B4 FF") >= 0);
          
          // Tinh phi theo logic JavaScript
          // freeThreshold: 1, overnightThreshold: 3, dayThreshold: 5
          if (minutes <= 1) {
            fee = 0; // Mien phi <= 1 phut
          } else if (minutes <= 3) {
            // Ve luot (> 1 phut, <= 3 phut)
            fee = isMember ? 3000 : 5000;
          } else if (minutes < 5) {
            // Qua dem (> 3 phut, < 5 phut)
            fee = isMember ? 7000 : 10000;
          } else {
            // Nhieu ngay (>= 5 phut)
            long extraMinutes = minutes - 5; // Phut vuot qua nguong
            long days = (extraMinutes / 5) + 1; // So "ngay" them
            if (isMember) {
              fee = 7000 * days;
            } else {
              fee = 10000 * days;
            }
          }
          
          // Dam bao fee khong am
          if (fee < 0) {
            fee = 0;
          }
          
          tickets[i].active = false;
          break;
        }
      }

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Phi Gui Xe");
      lcd.setCursor(0, 1);
      lcd.print("So Tien: ");
      lcd.print(fee);
      lcd.print(" VND");

      beepOnce();
      delay(3000);

      smoothOpenGate();
      Slot++;

      // GUI SU KIEN XE RA (them duration)
      sendEvent("EXIT", currentUID, fee, minutes);
      sendDashboardData(); // Cap nhat ngay

      while (digitalRead(IR_ENTRY) == HIGH);
      while (digitalRead(IR_ENTRY) == LOW);

      smoothCloseGate();
      lcd.clear();
    }
    else {
      lcd.clear();
      lcd.print("The chua gui xe");
      delay(2000);
      lcd.clear();
    }
  }

  // GUI DU LIEU DINH KY (moi 2 giay)
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendDashboardData();
    lastSendTime = currentTime;
  }

  // HIEN THI LCD
  DateTime now = rtc.now();

  if (now.second() != lastSecond) {
    lastSecond = now.second();

    lcd.setCursor(0, 0);
    if (now.hour() < 10) lcd.print("0");
    lcd.print(now.hour());
    lcd.print(":");
    if (now.minute() < 10) lcd.print("0");
    lcd.print(now.minute());
    lcd.print(":");
    if (now.second() < 10) lcd.print("0");
    lcd.print(now.second());

    lcd.print(" ");
    if (now.day() < 10) lcd.print("0");
    lcd.print(now.day());
    lcd.print("/");
    if (now.month() < 10) lcd.print("0");
    lcd.print(now.month());
    lcd.print("  ");
  }

  lcd.setCursor(0, 1);
  lcd.print("Cho Trong: ");
  lcd.print(Slot);                                 
  lcd.print("   ");
}
