/**
 * Parses a string with custom delimiters into an array of structured objects.
 *
 * @param {string} fileContent The raw string content from the delimited file.
 * @returns {Array<Object>} An array of objects, where each object represents a record
 * from the file and contains the parsed data.
 */
function parseData(fileContent) {
  // Records are delimited by lines ending with THIS__IS__PEMUTUS__
  // The format has multi-line JSON fields
  const fieldDelimiter = '|||||';
  const recordDelimiter = /\|\|\|\|\|"THIS__IS__PEMUTUS__"\r?\n/;

  // Split by record delimiter
  const rawRecords = fileContent.split(recordDelimiter);
  
  // Filter out header and empty records
  const dataRecords = rawRecords.filter(record => {
    const trimmed = record.trim();
    if (!trimmed) return false;
    const upperTrimmed = trimmed.toUpperCase();
    return !upperTrimmed.startsWith('"MMS_ID') && !upperTrimmed.startsWith('MMS_ID');
  });

  // Process each record string to convert it into a structured object.
  const processedData = dataRecords.map(recordStr => {
    // Split the record string into its constituent fields.
    const fields = recordStr.trim().split(fieldDelimiter);

    // Helper to strip surrounding quotes and unescape inner quotes
    const cleanField = (field) => {
      if (!field) return field;
      let cleaned = field.trim();
      // Remove leading/trailing quotes
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      // Unescape doubled quotes
      cleaned = cleaned.replace(/""/g, '"');
      return cleaned;
    };

    // Assign fields to variables based on their order.
    const mms_id = cleanField(fields[0]);
    const versionNum = cleanField(fields[1]);
    const creator = cleanField(fields[2]);
    const create_date = cleanField(fields[3]);
    const entityRelations = cleanField(fields[4]);
    const accessData = cleanField(fields[5]);
    const researchEntityValue = cleanField(fields[6]);
    const visibilityData = cleanField(fields[7]);
    const mmsRecordValue = cleanField(fields[8]);

    // Create the JavaScript object and strings as requested.
    const version = {
      mmsId: mms_id,
      version: versionNum,
      createdBy: creator,
      createdDate: create_date
    };

    const entityRelationsAsJsonString = entityRelations;
    const accessDataAsJsonString = accessData;
    const researchEntityValueAsJsonString = researchEntityValue;
    const visibilityDataAsJsonString = visibilityData;

    // Return a single object containing all the created parts for this record.
    return {
      version,
      entityRelationsAsJsonString,
      accessDataAsJsonString,
      researchEntityValueAsJsonString,
      visibilityDataAsJsonString,
      mmsRecordValueAsXmlString: mmsRecordValue
    };
  });

  return processedData;
}

// --- Example Usage ---

// Paste the full content of your SampleA.txt file here.
// Note: For this example, only the first record is used for brevity.
const sampleFileContent = `
991014631949904721|||||1|||||System|||||06/07/25 12:46:47.692000000 PM GMT|||||{"creators":[{"targetEntityId":-1,"targetEntityType":"PERSON","relationType":"STUDENT","targetSupplement":"{\\"firstName\\":\\"Gabrielle\\",\\"lastName\\":\\"Russo\\",\\"sendUsage\\":{\\"sendUsage\\":false,\\"changedByUser\\":false},\\"affiliationName\\":\\"DU\\",\\"affiliation\\":\\"DU\\",\\"middleName\\":\\"R.\\",\\"suffix\\":\\"\\",\\"email\\":\\"\\",\\"displayInPublicProfile\\":false}","order":1,"status":"MANUAL","researcherNotification":"DO_NOT_SEND"}],"contributors":[{"targetEntityId":1973660260004721,"targetEntityType":"PERSON","relationType":"CONTRIBUTED","targetSupplement":"{\\"owner\\":false,\\"publishedLastName\\":\\"Geller\\",\\"publisherRole\\":\\"Advisor\\",\\"publishedMiddleName\\":\\"A.\\",\\"matchGrade\\":0.0,\\"orcid\\":\\"0009-0005-0111-1209\\",\\"sourcePublishedAffiliation\\":\\"Drexel University (1970-)\\",\\"publishedFirstName\\":\\"Pamela\\",\\"displayInPublicProfile\\":true,\\"publishedNameSuffix\\":\\"\\",\\"publishedAffiliationName\\":\\"Drexel University (1970-)\\"}","order":1,"status":"APPROVED","researcherNotification":"DO_NOT_SEND"}],"grants":[],"assets":[],"organizations":[{"targetEntityId":13524288500004721,"targetEntityType":"ORGANIZATION","relationType":"ORGANIZATION","order":0,"status":"MANUAL"},{"targetEntityId":13524286200004721,"targetEntityType":"ORGANIZATION","relationType":"ORGANIZATION","order":1,"status":"MANUAL"},{"targetEntityId":13524289080004721,"targetEntityType":"ORGANIZATION","relationType":"ORGANIZATION","order":2,"status":"MANUAL"}]}|||||{"openAccess":"","accessRightsPolicyId":9735317810004721}|||||{ "repId": 12321325700004721, "metricsModel": { "metricsSourceToTotalCount": { "SCOPUS": 0 } }, "resourceType": "ETD_GRADUATE", "identifiers": { "assetIdentifiers": { "ADDITIONAL01": [ "1112704492" ], "ADDITIONAL02": [ "991013316048304721" ], "DOI": [ "10.17918/pew7-c562" ], "URI": [ "https://idea.library.drexel.edu/islandora/object/idea:9492" ] } }, "dates": { "assetDates": { "DATE_DEGREE": { "dateType": "DATE_DEGREE", "datesList": [ "201905" ] }, "DATE_COMPLETED": { "dateType": "DATE_COMPLETED", "datesList": [ "201905" ] }, "DATE_ISSUED": { "dateType": "DATE_ISSUED", "datesList": [ "201905" ] }, "DATE_PUBLISHED": { "dateType": "DATE_PUBLISHED", "datesList": [ "201905" ] } } }, "titles": { "titles": { "OTHER": { "titleType": "OTHER", "titlesList": { "translationMap": { "und": [ "" ] }, "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" }, "subTitlesList": { "translationMethod": "NOT_TRANSLATED" } }, "TRANSLATION": { "titleType": "TRANSLATION", "titlesList": { "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" }, "subTitlesList": { "translationMethod": "NOT_TRANSLATED" } }, "ALTERNATIVE": { "titleType": "ALTERNATIVE", "titlesList": { "translationMap": { "und": [ "" ] }, "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" }, "subTitlesList": { "translationMethod": "NOT_TRANSLATED" } }, "MAIN": { "titleType": "MAIN", "titlesList": { "translationMap": { "und": [ "Examination of the Relationships Among Perceived Social Support, Parent-Infant Bonding, and Parent Mental Health in the 3 to 12 Months Following the Birth of a Child" ] }, "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" }, "subTitlesList": { "translationMap": { "und": [ "" ] }, "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" } } } }, "descriptions": { "assetDescriptions": { "ABSTRACT": { "type": "ABSTRACT", "descriptions": { "translationMap": { "und": [ "Infant development is subject to great influence from one's immediate social environment and caregivers. Therefore, the health of the parent-infant relationship and substantial parent-child interactions are crucial for maximizing exploration and learning opportunities for the child. Previous studies have showed that greater satisfaction with social support may be associated with more positive mental health (Dennis & Letourneau, 2007; Heh et al., 2004). Additionally, research has found that poor parental mental health symptoms relate to poor parent-baby interaction (Parfitt, Pike, and Ayers, 2013). Notably, Lutz et al. (2012) observed an interaction effect of informational social support on maternal-child interactions for mothers with high levels of stress. Thus, evidence suggests reason to investigate an association between social support and parent-infant bonding. The current study extended extant literature as it attempted to distinguish a direct association between satisfaction with social support and parent-infant bonding. It evaluated relationship satisfaction, which may play a crucial role in the mental health of parents (Dudley et al., 2001) and the parent-child relationship (Erel & Burman, 1995). Previous studies primarily assess heterosexual mothers, making this research unique in that fathers and individuals who are members of a non-heterosexual couple were eligible for participation. It was hypothesized that: 1) a direct relationship exists between satisfaction with social support and parent-infant bonding, 2) parent mental health mediates the relationship between satisfaction with social support and parent-infant bonding, and 3) parental perceptions of infant temperament are associated with parental mental health and parent-infant bonding. (Full hypotheses detailed in manuscript.) The current study had a cross-sectional, self-report design. The measures included in this study assessed parent-infant bonding, satisfaction with social support, anxiety and depressive symptoms, parental stress, relationship satisfaction, and infant temperament. The relationship between parent-infant bonding and satisfaction with social support was analyzed. Anxiety, depression, and parental stress were examined as potential mediators. Parents of 3 to 12-month-old infants with a current romantic partner, all in cohabitation, were eligible to complete the survey administered on Amazon Turk Prime with compensation provided. Hypotheses were analyzed using a series of correlations and mediation analyses. Findings from the current study indicate that a parent's satisfaction with the overall social support positively associated with a quality parental-infant bond. Partner social support may play an even bigger role in the promotion of the parent-infant bonding. The relationship between social support and parent-infant bonding was partially mediated by decreased symptoms of anxiety, depression, and parental stress. Additionally, other factors may explain this relationship, and should be examined moving forward (e.g., financial resources or attachment style of parents). Infant temperament and a parent's confidence in reading their infant's cues strongly associated with decreased anxiety, depression, and parental stress symptoms, as well as with parent-infant bonding. Future analyses should incorporate parental perception of infant temperament when investigating postpartum parents' mental health and interactions with their child. The quality of the parental bond to one's infant varied significantly by caregiver; mothers reported higher quality parent-infant bonding on average compared with other caregivers. On the other hand, other caregivers rated their satisfaction with social support from their partner, family, and friends higher on average compared to mothers. These findings show many opportunities for interventions to promote parent-child relationships while in the perinatal period." ] }, "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" } } } }, "publisher": { "publisherName": "Drexel University", "publicationPlace": [ "Philadelphia, Pennsylvania" ] }, "access": { "accessRightsPolicyId": 9735317810004721 }, "keywords": { "translationMap": { "und": [ "Parents--Mental health", "Social networks" ] }, "translatableType": "LIST", "translationMethod": "NOT_TRANSLATED" }, "subjectEsploro": [ "0715095", "0414000" ], "general": { "language": [ "eng" ], "pages": "ix, 73 pages", "assetAffiliation": [ "01DRXU_INST___3651", "01DRXU_INST___01DRXU_INST", "01DRXU_INST___3684" ], "depositStatus": "imported" }, "originalRepository": { "assetId": "991014631949904721" }, "etd": { "degreeGrantor": [ "Drexel University" ], "degreeLevel": "1", "degreeName": "M.S.", "degreeProgram": "Psychology", "dissType": "Thesis" }, "localFields": { "fields": { "1": { "fieldNumber": 1, "fieldValue": "9492" }, "2": { "fieldNumber": 2 }, "3": { "fieldNumber": 3, "fieldValue": "Russo, Gabrielle R.|Author||||;Geller, Pamela A.|Advisor|naf|http://id.loc.gov/authorities/names/nb2003026069||pg27;College of Arts and Sciences|College|naf|http://id.loc.gov/authorities/names/no2017058773||" }, "4": { "fieldNumber": 4, "fieldValue": "Psychology|fast|http://id.worldcat.org/fast/1081447;Mental health|fast|http://id.worldcat.org/fast/1016339;Parents--Mental health|fast|http://id.worldcat.org/fast/1053475;Social networks|fast|http://id.worldcat.org/fast/1122678" }, "5": { "fieldNumber": 5 }, "6": { "fieldNumber": 6 }, "7": { "fieldNumber": 7 }, "8": { "fieldNumber": 8, "fieldValue": "nonfiling: 0" }, "9": { "fieldNumber": 9 }, "10": { "fieldNumber": 10 }, "11": { "fieldNumber": 11 }, "12": { "fieldNumber": 12 }, "13": { "fieldNumber": 13 }, "14": { "fieldNumber": 14 }, "15": { "fieldNumber": 15 } } }, "filesModel": { "files": [ { "fileId": "88589773580004721", "fileOrder": 0, "creationDate": "2025-03-13 15:36:36", "createdBy": "djc54", "modificationDate": "2025-03-13 15:36:36", "mmsId": "991014631949904721", "repId": "12321325700004721", "label": "idea_9492_OBJ", "fileOriginalPath": "01DRXU_INST/storage/alma/53/93/49/2E/38/1C/0B/18/EC/24/CE/2F/D2/12/F5/B5/idea_9492_OBJ.pdf", "fileOriginalName": "idea_9492_OBJ.pdf", "fileExtension": "pdf", "fileMIMEType": "application/pdf", "fileSizeBytes": "954675", "fileSupplementalEsploro": "no", "inStorage": true, "mid": "13321535790004721" } ] } }|||||{"profileVisibility":true,"portalVisibility":true}|||||THIS__IS__PEMUTUS__
`;

if (require.main === module) {
  // Call the function with the sample data.
  const allParsedRecords = parseData(sampleFileContent);

  // Display the first parsed record to verify the output.
  if (allParsedRecords.length > 0) {
    const firstRecord = allParsedRecords[0];

    console.log("--- Parsed Record 1 ---");

    console.log("\njs object version:");
    console.log(firstRecord.version);

    console.log("\njs string entityRelationsAsJsonString:");
    console.log(firstRecord.entityRelationsAsJsonString);

    console.log("\njs string accessDataAsJsonString:");
    console.log(firstRecord.accessDataAsJsonString);

    console.log("\njs string researchEntityValueAsJsonString:");
    console.log(firstRecord.researchEntityValueAsJsonString);

    console.log("\njs string visibilityDataAsJsonString:");
    console.log(firstRecord.visibilityDataAsJsonString);
  } else {
    console.log("No records were parsed.");
  }
}

module.exports = {
  parseData
};