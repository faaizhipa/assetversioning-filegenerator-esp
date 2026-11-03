#!/usr/bin/env node
/**
 * Complete Data Processing Orchestrator
 * 
 * This script performs the full workflow:
 * 1. Loads all lookup tables from lookup/ directory
 * 2. Reads and parses the input file
 * 3. Transforms records according to mapping-guide.md
 * 4. Applies all lookups for code-to-name translations
 * 5. Generates JSON output files that exactly match output_actual/
 */

const fs = require('fs');
const path = require('path');
const { parseData } = require('./convert-from-dsv');

// ============================================================================
// Configuration and Constants
// ============================================================================

const ROOT_DIR = __dirname;
const LOOKUP_DIR = path.join(ROOT_DIR, 'lookup');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

// Find input file (starts with "input")
const INPUT_FILE = fs.readdirSync(ROOT_DIR)
  .filter(f => f.startsWith('input') && f.endsWith('.txt'))
  .map(f => path.join(ROOT_DIR, f))[0];

if (!INPUT_FILE) {
  console.error('ERROR: No input file found (expected file starting with "input" and ending with ".txt")');
  process.exit(1);
}

console.log(`Using input file: ${path.basename(INPUT_FILE)}`);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LANGUAGE_NAME_MAP = new Map([
  ['eng', 'English'],
  ['und', 'English']
]);

// ============================================================================
// Generic DSV Parser for Lookup Files
// ============================================================================

/**
 * Parses a DSV (delimiter-separated values) file with quoted fields
 * @param {string} content - File content
 * @param {string} delimiter - Field delimiter (default: semicolon)
 * @returns {Array<Array<string>>} Array of rows, each row is array of fields
 */
function parseQuotedDsv(content, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      if (field || row.length > 0) {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
      }
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

// ============================================================================
// Lookup Table Loaders
// ============================================================================

/**
 * Load SDG lookup table (code -> name)
 * Format: "SDG07";"ResearchSustainabilityGoals";"";"07 Affordable & clean energy";1
 */
function loadSdgLookup() {
  const filePath = path.join(LOOKUP_DIR, 'sdg.dsv');
  if (!fs.existsSync(filePath)) {
    console.warn(`WARNING: SDG lookup file not found: ${filePath}`);
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseQuotedDsv(content, ';');
  const lookup = new Map();

  // Skip header row - column 0 is code, column 3 is description
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 4) {
      const code = row[0];
      const name = row[3];
      if (code && name) {
        lookup.set(code, name);
      }
    }
  }

  console.log(`Loaded ${lookup.size} SDG entries`);
  return lookup;
}

/**
 * Load all Subject lookup tables (wildcard: Subjects-*.dsv)
 * Format: "1009000";"Materials Science"
 */
function loadSubjectLookups() {
  const lookup = new Map();
  
  // Find all subject files
  const subjectFiles = fs.readdirSync(LOOKUP_DIR)
    .filter(f => f.startsWith('Subject') && (f.endsWith('.txt') || f.endsWith('.dsv')));

  console.log(`Found ${subjectFiles.length} subject files`);

  subjectFiles.forEach(filename => {
    const filePath = path.join(LOOKUP_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseQuotedDsv(content, ';');

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const [code, name] = rows[i];
      if (code && name) {
        // Only add if not already present (first match wins)
        if (!lookup.has(code)) {
          lookup.set(code, name);
        }
      }
    }
  });

  console.log(`Loaded ${lookup.size} total subject entries`);
  return lookup;
}

/**
 * Load Access Rights lookup table (policy ID -> description)
 * Format: "ID";"RESOURCE_TYPE";"ACCESS_RIGHT_NAME";"ACCESS_RIGHT_DESC"
 * Column 0 is ID, column 2 is name
 */
function loadAccessRightsLookup() {
  const filePath = path.join(LOOKUP_DIR, 'access_rights.dsv');
  if (!fs.existsSync(filePath)) {
    console.warn(`WARNING: Access rights lookup file not found: ${filePath}`);
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseQuotedDsv(content, ';');
  const lookup = new Map();

  // Skip header row - column 0 is ID, column 2 is name
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 3) {
      const id = row[0];
      let label = row[2];
      
      if (id && label) {
        // Strip "Research:" prefix if present
        label = label.replace(/^Research:/, '');
        lookup.set(id, label);
      }
    }
  }

  console.log(`Loaded ${lookup.size} access rights entries`);
  return lookup;
}

/**
 * Load Research Organization lookup table (org code -> org name)
 * Format: "ORGANIZATION_CATEGORY";"ORGANIZATION_CODE";"ORGANIZATION_NAME";"UNIT_TYPE"
 * Column 1 is code, column 2 is name
 */
function loadResearchOrganizationLookup() {
  const filePath = path.join(LOOKUP_DIR, 'research_organization.dsv');
  if (!fs.existsSync(filePath)) {
    console.warn(`WARNING: Research organization lookup file not found: ${filePath}`);
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseQuotedDsv(content, ';');
  const lookup = new Map();

  // Skip header row - column 1 is code, column 2 is name
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 3) {
      const code = row[1];
      const name = row[2];
      
      if (code && name) {
        lookup.set(code, name);
      }
    }
  }

  console.log(`Loaded ${lookup.size} research organization entries`);
  return lookup;
}

/**
 * Load Academic Unit lookup table (code -> name)
 * Similar format to research org
 */
function loadAcademicUnitLookup() {
  const filePath = path.join(LOOKUP_DIR, 'academic_unit.dsv');
  if (!fs.existsSync(filePath)) {
    console.warn(`WARNING: Academic unit lookup file not found: ${filePath}`);
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseQuotedDsv(content, ';');
  const lookup = new Map();

  // Parse based on actual structure - need to check file format
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 2) {
      const code = row[0];
      const name = row[1];
      
      if (code && name) {
        lookup.set(code, name);
      }
    }
  }

  console.log(`Loaded ${lookup.size} academic unit entries`);
  return lookup;
}

/**
 * Load Grants lookup table (internal ID -> public grant ID)
 * Format varies - need to check actual file structure
 */
function loadGrantsLookup() {
  const filePath = path.join(LOOKUP_DIR, 'grants.dsv');
  if (!fs.existsSync(filePath)) {
    console.warn(`WARNING: Grants lookup file not found: ${filePath}`);
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseQuotedDsv(content, ';');
  const lookup = new Map();

  // Skip header, map targetEntityId to public ID
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 2) {
      const internalId = row[0];
      const publicId = row[1];
      
      if (internalId && publicId) {
        lookup.set(internalId, publicId);
      }
    }
  }

  console.log(`Loaded ${lookup.size} grants entries`);
  return lookup;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely parse JSON, return empty object on failure
 */
function parseJsonSafe(value) {
  if (!value || typeof value !== 'string') {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return {};
  }
}

/**
 * Format date from "DD/MM/YY HH:MM:SS.SSSSSSSSS AM/PM GMT" to "YYYY-MM-DD"
 */
function formatCreatedDate(rawDate) {
  if (!rawDate) return '';
  
  const [datePart] = rawDate.split(' ');
  if (!datePart) return '';
  
  // Input format is DD/MM/YY
  const [day, month, yearSuffix] = datePart.split('/');
  if (!month || !day || !yearSuffix) return '';
  
  const year = `20${yearSuffix.padStart(2, '0')}`;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Format date token from YYYYMM to "MMM YYYY" or YYYYMMDD to "DD MMM YYYY"
 */
function formatDisplayDate(token) {
  if (!token) return '';
  
  const str = String(token);
  
  if (str.length === 6) {
    // YYYYMM format
    const year = str.substring(0, 4);
    const monthNum = parseInt(str.substring(4, 6), 10);
    if (monthNum < 1 || monthNum > 12) return '';
    
    return `${MONTH_NAMES[monthNum - 1]} ${year}`;
  } else if (str.length === 8) {
    // YYYYMMDD format
    const year = str.substring(0, 4);
    const monthNum = parseInt(str.substring(4, 6), 10);
    const day = parseInt(str.substring(6, 8), 10);
    
    if (monthNum < 1 || monthNum > 12) return '';
    
    return `${day.toString().padStart(2, '0')} ${MONTH_NAMES[monthNum - 1]} ${year}`;
  }
  
  return '';
}

/**
 * Map language codes to full names
 */
function mapLanguageCodes(codes) {
  if (!Array.isArray(codes)) return [];
  return codes.map(code => LANGUAGE_NAME_MAP.get(code) || code);
}

/**
 * Format resource type from PUBLICATION_JOURNAL_ARTICLE to publication.journalArticle
 */
function formatResourceType(rawType) {
  if (!rawType) return '';
  
  const formatted = rawType.toLowerCase().replace(/_/g, '.');
  return formatted;
}

/**
 * Build translation list from translationMap
 */
function buildTranslationList(node) {
  const map = node && node.translationMap ? node.translationMap : {};
  const languages = Object.keys(map);
  
  if (!languages.length) return [''];
  
  const values = map[languages[0]];
  if (!Array.isArray(values) || !values.length) return [''];
  
  return values;
}

/**
 * Build translation objects array from translationMap
 */
function buildTranslationObjects(node) {
  const map = node && node.translationMap ? node.translationMap : {};
  const entries = [];
  
  for (const language of Object.keys(map)) {
    const values = map[language];
    if (!Array.isArray(values) || !values.length) continue;
    
    entries.push({ language, value: values[0] });
  }
  
  return entries;
}

/**
 * Build keyword objects from translationMap
 */
function buildKeywordObjects(node) {
  const map = node && node.translationMap ? node.translationMap : {};
  const entries = [];
  
  for (const language of Object.keys(map)) {
    const values = map[language];
    if (!Array.isArray(values) || !values.length) continue;
    
    entries.push({ language, values });
  }
  
  return entries;
}

/**
 * Extract identifier values from identifiers container
 */
function extractIdentifierValues(container) {
  const identifiers = {};
  const map = container && container.assetIdentifiers ? container.assetIdentifiers : {};
  const keyMap = Object.fromEntries(
    Object.keys(map).map(key => [key.toLowerCase(), key])
  );

  const desired = [
    ['identifier.doi', 'doi'],
    ['identifier.uri', 'uri'],
    ['identifier.pmid', 'pmid'],
    ['identifier.pmcid', 'pmcid'],
    ['identifier.handle', 'handle'],
    ['identifier.additional01', 'additional01'],
    ['identifier.additional02', 'additional02'],
    ['identifier.additional04', 'additional04'],
    ['identifier.wos', 'wos'],
    ['identifier.scopus', 'scopus']
  ];

  for (const [targetKey, sourceKey] of desired) {
    const actualKey = keyMap[sourceKey];
    if (actualKey && Array.isArray(map[actualKey]) && map[actualKey].length > 0) {
      identifiers[targetKey] = map[actualKey][0];
    }
  }

  return identifiers;
}

/**
 * Build local.fields object from localFields.fields
 */
function buildLocalFields(fieldsContainer) {
  const result = {};
  
  // Always include local.note1
  result['local.note1'] = '';
  
  if (!fieldsContainer) return result;

  for (let index = 1; index <= 15; index++) {
    const key = String(index);
    if (!Object.prototype.hasOwnProperty.call(fieldsContainer, key)) {
      continue;
    }

    const field = fieldsContainer[key];
    const hasValue = field && Object.prototype.hasOwnProperty.call(field, 'fieldValue');
    const value = hasValue ? field.fieldValue : '';

    result[`local.note${index}`] = value;
  }

  return result;
}

/**
 * Build creators array from entity relations
 */
function buildCreators(creators = []) {
  return creators
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(entry => {
      const supplement = parseJsonSafe(entry.targetSupplement);
      // Creators can have either firstName/lastName (for STUDENT type)
      // or publishedFirstName/publishedLastName (for CREATED type)
      const creator = {
        familyName: supplement.publishedLastName || supplement.lastName || '',
        givenName: supplement.publishedFirstName || supplement.firstName || '',
        middleName: supplement.publishedMiddleName || supplement.middleName || '',
        order: entry.order || 0
      };
      
      // Add almaUserId if targetEntityId exists and is positive
      if (entry.targetEntityId != null && entry.targetEntityId > 0) {
        creator.almaUserId = Number(entry.targetEntityId);
      }
      
      // Add email if available
      const email = supplement.publishedEmail || supplement.email || '';
      if (email) {
        creator.email = email;
      }
      
      creator.affiliationCode = supplement.publishedAffiliation || supplement.affiliation || '';
      creator.affiliationName = supplement.publishedAffiliationName || supplement.affiliationName || '';
      
      // Add isDisplayInPublicProfile for CREATED type (has published* fields) or usageStatistics for STUDENT type
      if (supplement.publishedFirstName || supplement.publishedLastName) {
        // CREATED type - use isDisplayInPublicProfile
        creator.isDisplayInPublicProfile = Boolean(supplement.displayInPublicProfile);
      } else {
        // STUDENT type - use usageStatistics
        creator.usageStatistics = Boolean(supplement.sendUsage && supplement.sendUsage.sendUsage);
      }
      
      return creator;
    });
}

/**
 * Build contributors array from entity relations
 */
function buildContributors(contributors = []) {
  return contributors
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(entry => {
      const supplement = parseJsonSafe(entry.targetSupplement);
      const contributor = {
        familyName: supplement.publishedLastName || '',
        givenName: supplement.publishedFirstName || ''
      };
      
      if (supplement.publishedMiddleName) {
        contributor.middleName = supplement.publishedMiddleName;
      }
      
      contributor.order = entry.order || 0;
      contributor.role = supplement.publisherRole || entry.relationType || '';
      
      if (entry.targetEntityId != null) {
        contributor.almaUserId = Number(entry.targetEntityId);
      }
      
      contributor.affiliationCode = supplement.sourcePublishedAffiliation || '';
      contributor.affiliationName = supplement.publishedAffiliationName || '';
      contributor.isDisplayInPublicProfile = Boolean(supplement.displayInPublicProfile);
      
      if (supplement.orcid) {
        contributor.identifierOrcid = supplement.orcid;
      }
      
      return contributor;
    });
}

/**
 * Build academic units array from affiliations and organizations
 */
function buildAcademicUnits(affiliations, organizations, orgLookup) {
  const names = [];

  // Process affiliation codes
  if (Array.isArray(affiliations)) {
    for (const code of affiliations) {
      const name = orgLookup.get(code);
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
  }

  // Process organization entity IDs
  if (Array.isArray(organizations)) {
    for (const org of organizations) {
      const code = org.targetEntityId;
      const name = orgLookup.get(code);
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
  }

  return names.map(organizationName => ({ organizationName }));
}

/**
 * Determine asset ID from local fields or files
 */
function determineAssetId(research) {
  const fields = research.localFields && research.localFields.fields;
  if (fields && fields['1'] && fields['1'].fieldValue) {
    return fields['1'].fieldValue;
  }
  
  const files = research.filesModel && research.filesModel.files;
  if (Array.isArray(files) && files.length > 0) {
    const label = files[0].label || files[0].fileOriginalName || '';
    const match = label.match(/(\d{3,})/g);
    if (match && match.length) {
      return match[match.length - 1];
    }
  }
  
  return '';
}

/**
 * Build files array
 */
function buildFiles(research) {
  const files = research.filesModel && Array.isArray(research.filesModel.files)
    ? research.filesModel.files
    : [];

  return files.map(file => {
    const fileName = file.fileOriginalName || file.label || '';
    const fileExtension = fileName.includes('.') 
      ? fileName.split('.').pop().toLowerCase() 
      : '';
    
    const entry = {
      fileName: fileName,
      fileDisplayName: file.fileDisplayName || '',
      fileLicenseCode: 'LUNKNOWN',
      fileContentType: fileExtension,
      fileRights: file.fileRights || 'Open',
      fileOrder: file.fileOrder || 0,
      fileSupplemental: file.fileSupplementalEsploro || 'no',
      fileSize: file.fileSizeBytes || ''
    };
    
    return entry;
  });
}

/**
 * Build asset open access rights object
 */
function buildAssetOpenAccessRights(accessData, accessRightsLookup) {
  const result = {
    assetLicense: 'LUNKNOWN'
  };
  const policyId = accessData.accessRightsPolicyId != null
    ? String(accessData.accessRightsPolicyId)
    : '';
  
  if (policyId) {
    let rights = accessRightsLookup.get(policyId);
    
    // Try ID variant (increment last digit)
    if (!rights) {
      const altId = policyId.slice(0, -1) + (parseInt(policyId.slice(-1)) + 1);
      rights = accessRightsLookup.get(altId);
    }
    
    if (rights) {
      result.accessRights = rights;
    }
  }
  
  return result;
}

/**
 * Build visibility object
 */
function buildVisibility(visibilityData) {
  return {
    portalVisibility: Boolean(visibilityData.portalVisibility),
    profileVisibility: Boolean(visibilityData.profileVisibility)
  };
}

/**
 * Build record object (core metadata)
 */
function buildRecord(research, entityRelations, orgLookup, subjectLookup, sdgLookup) {
  const recordEntries = [];

  // Event
  recordEntries.push(['event', { 'event.date': '' }]);

  // Title
  const mainTitle = research.titles && research.titles.titles && research.titles.titles.MAIN;
  const titleValue = mainTitle && mainTitle.titlesList
    ? buildTranslationList(mainTitle.titlesList)[0] || ''
    : '';
  recordEntries.push(['title', titleValue]);

  // Publisher
  recordEntries.push(['publisher', research.publisher?.publisherName || '']);

  // Language
  const languages = research.general?.language || [];
  recordEntries.push(['language', languages]);

  // ETD section
  const etd = research.etd || {};
  recordEntries.push(['etd', {
    'degree.grantor': Array.isArray(etd.degreeGrantor) ? etd.degreeGrantor : [],
    'degree.level': etd.degreeLevel || '',
    'degree.name': etd.degreeName || '',
    'degree.program': etd.degreeProgram || '',
    'degree.discipline': Array.isArray(etd.degreeDiscipline) ? etd.degreeDiscipline : [],
    'citizenship.author': Array.isArray(etd.citizenshipAuthor) ? etd.citizenshipAuthor : [],
    'diss.type': etd.dissType || ''
  }]);

  recordEntries.push(['patent', {}]);
  recordEntries.push(['originalRepository', { assetId: determineAssetId(research) }]);
  recordEntries.push(['temporary', {}]);

  // Translated languages
  recordEntries.push(['translatedLanguages', mapLanguageCodes(languages)]);

  // Display date
  const publishedToken = research.dates && research.dates.assetDates && research.dates.assetDates.DATE_PUBLISHED;
  recordEntries.push([
    'displayedDateByPriorityEsploroCP',
    publishedToken && Array.isArray(publishedToken.datesList) && publishedToken.datesList[0]
      ? formatDisplayDate(publishedToken.datesList[0])
      : ''
  ]);

  // Identifiers
  const identifiers = extractIdentifierValues(research.identifiers);
  for (const [key, value] of Object.entries(identifiers)) {
    recordEntries.push([key, value]);
  }

  // Alternative and other titles
  const alternative = research.titles && research.titles.titles && research.titles.titles.ALTERNATIVE;
  recordEntries.push(['title.alternative', buildTranslationList(alternative && alternative.titlesList)]);

  const otherTitle = research.titles && research.titles.titles && research.titles.titles.OTHER;
  recordEntries.push(['title.other', buildTranslationList(otherTitle && otherTitle.titlesList)]);

  // Publication place
  const publicationPlaces = research.publisher && Array.isArray(research.publisher.publicationPlace)
    ? research.publisher.publicationPlace
    : [];
  recordEntries.push(['publication.place', publicationPlaces]);

  // Date fields
  const assetDates = (research.dates && research.dates.assetDates) || {};
  const dateMapping = [
    ['date.published', 'DATE_PUBLISHED'],
    ['date.issued', 'DATE_ISSUED'],
    ['date.completed', 'DATE_COMPLETED'],
    ['date.degree', 'DATE_DEGREE']
  ];
  
  for (const [key, source] of dateMapping) {
    const node = assetDates[source];
    const value = node && Array.isArray(node.datesList) ? node.datesList[0] : undefined;
    if (value) {
      recordEntries.push([key, value]);
    }
  }

  // Resource type
  if (research.resourceType) {
    const formatted = formatResourceType(research.resourceType);
    recordEntries.push(['resourcetype.esploro', formatted]);
  }

  // Subject (with lookup)
  if (Array.isArray(research.subjectEsploro) && research.subjectEsploro.length > 0) {
    const subjectNames = research.subjectEsploro
      .map(code => subjectLookup.get(String(code)) || null)
      .filter(name => name !== null);
    
    if (subjectNames.length > 0) {
      recordEntries.push(['subject.esploro', subjectNames]);
    }
  }

  // Keywords
  if (research.keywords && research.keywords.translationMap) {
    const keywordObjects = buildKeywordObjects(research.keywords);
    if (keywordObjects.length > 0) {
      recordEntries.push(['keywords', keywordObjects]);
    }
  }

  // SDG (with lookup)
  if (Array.isArray(research.sdgList) && research.sdgList.length > 0) {
    const sdgNames = research.sdgList
      .map(code => sdgLookup.get(code) || null)
      .filter(name => name !== null);
    
    if (sdgNames.length > 0) {
      recordEntries.push(['sdg', sdgNames]);
    }
  }

  // Description abstract
  const abstractNode = research.descriptions && research.descriptions.assetDescriptions && 
                       research.descriptions.assetDescriptions.ABSTRACT;
  if (abstractNode && abstractNode.descriptions) {
    const abstracts = buildTranslationObjects(abstractNode.descriptions);
    if (abstracts.length > 0) {
      recordEntries.push(['description.abstract', abstracts]);
    }
  }

  // Description bibliographic
  const bibliographicNode = research.descriptions && research.descriptions.assetDescriptions && 
                            research.descriptions.assetDescriptions.BIBLIOGRAPHIC;
  if (bibliographicNode && bibliographicNode.descriptions) {
    const bibliographic = buildTranslationObjects(bibliographicNode.descriptions);
    if (bibliographic.length > 0) {
      recordEntries.push(['description.bibliographic', bibliographic]);
    }
  }

  // Local fields
  const localFields = buildLocalFields(research.localFields && research.localFields.fields);
  recordEntries.push(['local.fields', localFields]);

  // Esploro deposit policy (empty object)
  recordEntries.push(['esploroDepositPolicy', {}]);

  // Build final record object
  const record = {};
  for (const [key, value] of recordEntries) {
    record[key] = value;
  }

  return record;
}

/**
 * Custom JSON stringifier to match output format
 */
function stringifyEsploroJson(value) {
  let json = JSON.stringify(value, null, 2);
  
  // Add space after colons
  json = json.replace(/":/g, '" :');
  
  // Format empty objects and arrays
  json = json.replace(/\{\}/g, '{ }');
  json = json.replace(/\[\]/g, '[ ]');
  
  // Remove quotes from numeric mmsId
  json = json.replace(/"mmsId" : "(\d+)"/g, '"mmsId" : $1');
  
  // Collapse simple single-element arrays to one line (including empty strings)
  json = json.replace(/\[\s*\n\s*"([^"]*)"\s*\n\s*\]/g, '[ "$1" ]');
  
  return `${json}\n`;
}

/**
 * Transform a single record into final assetData structure
 */
function transformRecord(record, lookups, maxVersions) {
  // Parse JSON strings
  const version = record.version;
  const entityRelations = parseJsonSafe(record.entityRelationsAsJsonString);
  const accessData = parseJsonSafe(record.accessDataAsJsonString);
  const research = parseJsonSafe(record.researchEntityValueAsJsonString);
  const visibilityData = parseJsonSafe(record.visibilityDataAsJsonString);

  // Build asset data structure
  const assetData = {
    mmsId: version.mmsId,
    version: parseInt(version.version, 10),
    createdBy: version.createdBy || '',
    createdDate: formatCreatedDate(version.createdDate),
    assetOpenAccessRights: buildAssetOpenAccessRights(accessData, lookups.accessRights),
    record: buildRecord(research, entityRelations, lookups.researchOrg, lookups.subjects, lookups.sdg),
    creators: buildCreators(entityRelations.creators),
    contributors: buildContributors(entityRelations.contributors),
    visibility: buildVisibility(visibilityData),
    files: buildFiles(research),
    academicUnits: buildAcademicUnits(
      research.general?.assetAffiliation,
      entityRelations.organizations,
      lookups.researchOrg
    )
  };

  // Determine filename
  const isMaxVersion = version.version === maxVersions.get(version.mmsId);
  const filename = isMaxVersion
    ? `Asset_Version_${version.mmsId}_Current_Version_${version.version}.json`
    : `Asset_Version_${version.mmsId}_${version.version}.json`;

  return { assetData, filename };
}

// ============================================================================
// Main Processing Function
// ============================================================================

function main() {
  console.log('\n=== Starting Data Processing Workflow ===\n');

  // Step 1: Load all lookup tables
  console.log('Step 1: Loading lookup tables...');
  const lookups = {
    sdg: loadSdgLookup(),
    subjects: loadSubjectLookups(),
    accessRights: loadAccessRightsLookup(),
    researchOrg: loadResearchOrganizationLookup(),
    academicUnit: loadAcademicUnitLookup(),
    grants: loadGrantsLookup()
  };
  console.log('');

  // Step 2: Read input file
  console.log('Step 2: Reading input file...');
  const rawInput = fs.readFileSync(INPUT_FILE, 'utf8');
  console.log(`Read ${rawInput.length} characters from input file`);
  console.log('');

  // Step 3: Parse DSV to raw records
  console.log('Step 3: Parsing input data...');
  const rawRecords = parseData(rawInput);
  console.log(`Parsed ${rawRecords.length} records`);
  console.log('');

  // Step 4: Pre-compute maximum versions for each MMS ID
  console.log('Step 4: Computing maximum versions...');
  const maxVersions = new Map();
  
  for (const record of rawRecords) {
    const mmsId = record.version.mmsId;
    const versionNum = record.version.version;
    
    if (!maxVersions.has(mmsId) || versionNum > maxVersions.get(mmsId)) {
      maxVersions.set(mmsId, versionNum);
    }
  }
  
  console.log(`Found ${maxVersions.size} unique MMS IDs`);
  console.log('');

  // Step 5: Transform records and generate output
  console.log('Step 5: Transforming records and generating output...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const record of rawRecords) {
    try {
      const { assetData, filename } = transformRecord(record, lookups, maxVersions);
      
      // Write to file
      const outputPath = path.join(OUTPUT_DIR, filename);
      const jsonContent = stringifyEsploroJson(assetData);
      fs.writeFileSync(outputPath, jsonContent, 'utf8');
      
      successCount++;
      console.log(`✓ ${filename}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Error processing record ${record.version?.mmsId}: ${error.message}`);
    }
  }

  console.log('');
  console.log('=== Processing Complete ===');
  console.log(`Success: ${successCount} files`);
  console.log(`Errors: ${errorCount} files`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

// ============================================================================
// Entry Point
// ============================================================================

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  }
}

module.exports = { main, parseQuotedDsv };
