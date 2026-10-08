/**
 * THE OLIVE ROOMS - Google Sheets reservation backend
 *
 * 1) Create a Google Sheet.
 * 2) Rename the first tab to Reservations.
 * 3) Put this script in Extensions > Apps Script.
 * 4) Set SHEET_ID below.
 * 5) Deploy as Web app: Execute as Me; Who has access: Anyone.
 */

const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Reservations';
const DRIVE_FOLDER_ID = ''; // Optional. Leave blank to save uploads in My Drive root.

function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Name', 'Phone', 'Email', 'Guests', 'Check-in', 'Check-out',
      'Service', 'Room / Package', 'Special Request', 'Document Name', 'Document URL', 'Consent'
    ]);
    sheet.setFrozenRows(1);
  }
  return 'Sheet ready';
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'The Olive Rooms reservations' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) setupSheet();

    let documentUrl = '';
    if (data.documentBase64 && data.documentName) {
      const bytes = Utilities.base64Decode(data.documentBase64);
      const blob = Utilities.newBlob(bytes, data.documentType || 'application/octet-stream', data.documentName);
      const file = DRIVE_FOLDER_ID
        ? DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob)
        : DriveApp.createFile(blob);
      documentUrl = file.getUrl();
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      clean_(data.name),
      clean_(data.phone),
      clean_(data.email),
      clean_(data.guests),
      clean_(data.checkIn),
      clean_(data.checkOut),
      clean_(data.service),
      clean_(data.room),
      clean_(data.message),
      clean_(data.documentName),
      documentUrl,
      data.consent === 'on' ? 'Yes' : clean_(data.consent)
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, documentUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function clean_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, 5000);
}
