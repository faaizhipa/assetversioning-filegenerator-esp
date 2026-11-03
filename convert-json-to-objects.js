/**
 * This file demonstrates the process of converting a JSON string 
 * into a JavaScript object. This is a common task when receiving 
 * data from an API or reading from a .json file.
 */

// --- Step 1: Start with the data as a JSON string ---
// Imagine this string is what you received from a server.
// Note the keys and string values are all in double quotes, as required by JSON.
const accessDataAsJsonString = `{
  "openAccess": "YES",
  "openAccessStatus": "diamond",
  "licenseCode": "CCBY_V4.0",
  "accessRightsPolicyId": 9506793490000561
}`;

console.log("--- Data before conversion (Type: " + typeof accessDataAsJsonString + ") ---");
console.log(accessDataAsJsonString);


// --- Step 2: Use the built-in JSON.parse() method ---
// This is the core of the conversion process. JSON.parse() takes a
// valid JSON string and transforms it into a native JavaScript object.
const accessDataObject = JSON.parse(accessDataAsJsonString);


// --- Step 3: Use the converted JavaScript object ---
// Now that it's an object, you can access its properties using dot notation.
console.log("\n--- Data after conversion (Type: " + typeof accessDataObject + ") ---");
console.log(accessDataObject);

console.log("\nAccessing a specific property after conversion:");
console.log("License Code:", accessDataObject.licenseCode); // Outputs: CCBY_V4.0

// The process would be identical for your other data sources like 
// researchEntityValue and entityRelations if they were provided as strings.
