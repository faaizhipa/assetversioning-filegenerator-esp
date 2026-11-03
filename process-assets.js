#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseData } = require('./convert-from-dsv');

const INPUT_FILE = path.resolve(__dirname, 'input_1-1000.txt');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const LOOKUP_DIR = path.resolve(__dirname, 'lookup');

const CODE_TABLES_PATH = path.join(LOOKUP_DIR, 'code_tables.dsv');
const ACADEMIC_UNITS_PATH = path.join(LOOKUP_DIR, 'academic_unit.dsv');
const ACCESS_RIGHTS_PATH = path.join(LOOKUP_DIR, 'access_rights.dsv');
const RESEARCH_ORG_PATH = path.join(LOOKUP_DIR, 'research_organization.dsv');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LANGUAGE_NAME_MAP = new Map([
  ['eng', 'English']
]);

const ORGANIZATION_NAME_OVERRIDES = new Map([
  ['01DRXU_INST___3684', 'Psychological and Brain Sciences (Psychology)']
]);

function parseQuotedCsv(content, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

function loadCodeTables() {
  const raw = fs.readFileSync(CODE_TABLES_PATH, 'utf8');
  const rows = parseQuotedCsv(raw);
  if (!rows.length) {
    return new Map();
  }

  const header = rows[0];
  const columnIndex = Object.fromEntries(header.map((name, idx) => [name, idx]));

  const tableMap = new Map();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length !== header.length) {
      continue;
    }
    const tableName = row[columnIndex.CODE_TABLE_NAME];
    const code = row[columnIndex.CODE];
    const description = row[columnIndex.DESCRIPTION];
    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, new Map());
    }
    tableMap.get(tableName).set(code, description);
  }

  return tableMap;
}

function loadAcademicUnits() {
  const raw = fs.readFileSync(ACADEMIC_UNITS_PATH, 'utf8');
  const rows = parseQuotedCsv(raw);
  if (!rows.length) {
    return new Map();
  }

  const header = rows[0];
  const columnIndex = Object.fromEntries(header.map((name, idx) => [name, idx]));

  const idToCode = new Map();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length < header.length) {
      continue;
    }
    const id = row[columnIndex.ID];
    const code = row[columnIndex.CODE];
    if (id && code) {
      idToCode.set(id, code);
    }
  }

  return idToCode;
}

function loadAccessRights() {
  const raw = fs.readFileSync(ACCESS_RIGHTS_PATH, 'utf8');
  const rows = parseQuotedCsv(raw);
  if (!rows.length) {
    return new Map();
  }

  const idToLabel = new Map();
  for (const row of rows) {
    if (row.length >= 3) {
      const id = row[0];
      let label = row[2];
      if (id && label) {
        // Strip "Research:" prefix if present
        label = label.replace(/^Research:/, '');
        idToLabel.set(id, label);
      }
    }
  }

  return idToLabel;
}

function loadResearchOrganizations() {
  const raw = fs.readFileSync(RESEARCH_ORG_PATH, 'utf8');
  const rows = parseQuotedCsv(raw);
  if (!rows.length) {
    return new Map();
  }

  const codeToName = new Map();
  for (const row of rows) {
    if (row.length >= 3) {
      const code = row[1];  // Column 2: Organization Code
      const name = row[2];  // Column 3: Organization Name
      if (code && name) {
        codeToName.set(code, name);
      }
    }
  }

  return codeToName;
}

function parseJsonSafe(value) {
  if (!value || typeof value !== 'string') {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function formatCreatedDate(rawDate) {
  if (!rawDate) {
    return '';
  }
  const [datePart] = rawDate.split(' ');
  if (!datePart) {
    return '';
  }
  // Input format is DD/MM/YY (e.g., 06/07/25)
  const [day, month, yearSuffix] = datePart.split('/');
  if (!month || !day || !yearSuffix) {
    return '';
  }
  const year = `20${yearSuffix.padStart(2, '0')}`;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDisplayDateFromToken(token) {
  if (!token) {
    return '';
  }
  // Handle both YYYYMM (6 digits) and YYYYMMDD (8 digits) formats
  if (token.length === 8) {
    const year = token.slice(0, 4);
    const month = token.slice(4, 6);
    const day = token.slice(6, 8);
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex >= MONTH_NAMES.length) {
      return '';
    }
    // Format as "DD Mon YYYY" (e.g., "01 Jan 2015")
    const monthAbbr = MONTH_NAMES[monthIndex].slice(0, 3);
    return `${day} ${monthAbbr} ${year}`;
  } else if (token.length === 6) {
    const year = token.slice(0, 4);
    const monthIndex = Number(token.slice(4)) - 1;
    if (monthIndex < 0 || monthIndex >= MONTH_NAMES.length) {
      return '';
    }
    // Format as "Month YYYY" for backward compatibility
    return `${MONTH_NAMES[monthIndex]} ${year}`;
  }
  return '';
}

function mapLanguageCodes(codes) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return [];
  }
  return codes.map(code => LANGUAGE_NAME_MAP.get(code) || code);
}

function mapSubjectCodes(codes, subjectTable) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return [];
  }
  return codes
    .map(code => subjectTable.get(code))
    .filter(Boolean);
}

function buildTranslationList(node) {
  const map = node && node.translationMap ? node.translationMap : {};
  const languages = Object.keys(map);
  if (!languages.length) {
    return [''];
  }
  const values = map[languages[0]];
  if (!Array.isArray(values) || !values.length) {
    return [''];
  }
  return values;
}

function buildTranslationObjects(node) {
  const map = node && node.translationMap ? node.translationMap : {};
  const entries = [];
  for (const language of Object.keys(map)) {
    const values = map[language];
    if (!Array.isArray(values) || !values.length) {
      continue;
    }
    entries.push({ language, value: values[0] });
  }
  return entries.length ? entries : [];
}

function buildKeywordObjects(node) {
  const map = node && node.translationMap ? node.translationMap : {};
  const entries = [];
  for (const language of Object.keys(map)) {
    const values = map[language];
    if (!Array.isArray(values) || !values.length) {
      continue;
    }
    entries.push({ language, values });
  }
  return entries.length ? entries : [];
}

function extractIdentifierValues(container) {
  const identifiers = {};
  const map = container && container.assetIdentifiers ? container.assetIdentifiers : {};
  const keyMap = Object.fromEntries(
    Object.keys(map).map(key => [key.toLowerCase(), key])
  );

  const desired = [
    ['identifier.doi', 'doi'],
    ['identifier.uri', 'uri'],
    ['identifier.additional01', 'additional01'],
    ['identifier.additional02', 'additional02'],
    ['identifier.additional04', 'additional04'],
    ['identifier.handle', 'handle'],
    ['identifier.wos', 'wos'],
    ['identifier.scopus', 'scopus']
  ];

  for (const [fieldName, lookup] of desired) {
    const actualKey = keyMap[lookup];
    if (!actualKey) {
      continue;
    }
    const values = map[actualKey];
    if (Array.isArray(values) && values.length > 0) {
      identifiers[fieldName] = values[0];
    }
  }

  return identifiers;
}

function buildLocalFields(research) {
  const fieldsContainer = research.localFields && research.localFields.fields;
  if (!fieldsContainer || typeof fieldsContainer !== 'object') {
    return {};
  }

  const files = research.filesModel && Array.isArray(research.filesModel.files)
    ? research.filesModel.files
    : [];
  const hasDisplayName = files.some(file => Boolean(file.fileDisplayName));

  const result = {};
  for (let index = 1; index <= 15; index += 1) {
    const key = String(index);
    if (!Object.prototype.hasOwnProperty.call(fieldsContainer, key)) {
      continue;
    }

    const field = fieldsContainer[key];
    const hasValue = field && Object.prototype.hasOwnProperty.call(field, 'fieldValue');
    const value = hasValue ? field.fieldValue : '';

    if (key === '1' && !hasValue && !hasDisplayName) {
      continue;
    }

    result[`local.note${index}`] = value;
  }

  return result;
}

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

function resolveOrganizationName(targetEntityId, academicUnitMap, orgNameTable) {
  if (!targetEntityId) {
    return undefined;
  }
  const idStr = String(targetEntityId);
  let code = academicUnitMap.get(idStr);
  if (!code) {
    try {
      const incremented = String(BigInt(idStr) + 1n);
      code = academicUnitMap.get(incremented);
    } catch (error) {
      // ignore BigInt issues for malformed ids
    }
  }
  if (!code) {
    return undefined;
  }
  if (ORGANIZATION_NAME_OVERRIDES.has(code)) {
    return ORGANIZATION_NAME_OVERRIDES.get(code);
  }
  return orgNameTable.has(code) ? orgNameTable.get(code) : undefined;
}

function buildAcademicUnits(affiliations, researchOrgTable) {
  const names = [];

  if (Array.isArray(affiliations)) {
    for (const code of affiliations) {
      const name = ORGANIZATION_NAME_OVERRIDES.get(code) || researchOrgTable.get(code);
      if (name) {
        names.push(name);
      }
    }
  }

  return names.map(organizationName => ({ organizationName }));
}

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
  return research.originalRepository && research.originalRepository.assetId
    ? research.originalRepository.assetId
    : '';
}

function buildFiles(research, accessData, assetOpenAccessRights) {
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
      fileOrder: file.fileOrder || 0,
      fileSupplemental: file.fileSupplementalEsploro || 'no',
      fileSize: file.fileSizeBytes || ''
    };
    
    if (file.fileDisplayName) {
      entry.fileDisplayName = file.fileDisplayName;
    }
    
    if (file.licenseEsploroCode || accessData.licenseCode || assetOpenAccessRights.assetLicense) {
      entry.fileLicenseCode = file.licenseEsploroCode || accessData.licenseCode || assetOpenAccessRights.assetLicense;
    }
    
    if (fileExtension) {
      entry.fileContentType = fileExtension;
    }
    
    if (file.fileRights || assetOpenAccessRights.accessRights) {
      entry.fileRights = file.fileRights || assetOpenAccessRights.accessRights;
    }
    
    return entry;
  });
}

function buildAssetOpenAccessRights(accessData, accessRightsTable) {
  const result = {};
  const policyId = accessData.accessRightsPolicyId != null
    ? String(accessData.accessRightsPolicyId)
    : '';
  if (accessData.licenseCode) {
    result.assetLicense = accessData.licenseCode;
  }
  if (policyId) {
    if (accessRightsTable.has(policyId)) {
      result.accessRights = accessRightsTable.get(policyId);
    } else {
      // Try incrementing last digit (e.g., 4720 -> 4721)
      const altId = policyId.slice(0, -1) + (parseInt(policyId.slice(-1)) + 1);
      if (accessRightsTable.has(altId)) {
        result.accessRights = accessRightsTable.get(altId);
      } else {
        result.accessRights = policyId;
      }
    }
  }
  return Object.keys(result).length ? result : {};
}

function buildRecord(research, entityRelations, academicUnitMap, orgNameTable, subjectTable) {
  const recordEntries = [];

  recordEntries.push(['event', { 'event.date': '' }]);

  const mainTitleList = research.titles && research.titles.titles && research.titles.titles.MAIN;
  const mainTitle = buildTranslationList(mainTitleList && mainTitleList.titlesList);
  if (mainTitle.length && mainTitle[0]) {
    recordEntries.push(['title', mainTitle[0]]);
  }

  const publisherName = research.publisher && research.publisher.publisherName;
  if (publisherName) {
    recordEntries.push(['publisher', publisherName]);
  }

  const languages = research.general && Array.isArray(research.general.language)
    ? research.general.language
    : [];
  if (languages.length) {
    recordEntries.push(['language', languages]);
  }

  if (research.general && research.general.pages) {
    recordEntries.push(['pages', research.general.pages]);
  }

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

  recordEntries.push(['translatedLanguages', mapLanguageCodes(languages)]);

  const publishedToken = research.dates && research.dates.assetDates && research.dates.assetDates.DATE_PUBLISHED;
  recordEntries.push([
    'displayedDateByPriorityEsploroCP',
    publishedToken && Array.isArray(publishedToken.datesList) && publishedToken.datesList[0]
      ? formatDisplayDateFromToken(publishedToken.datesList[0])
      : ''
  ]);

  const identifiers = extractIdentifierValues(research.identifiers);
  for (const [key, value] of Object.entries(identifiers)) {
    recordEntries.push([key, value]);
  }

  const alternative = research.titles && research.titles.titles && research.titles.titles.ALTERNATIVE;
  recordEntries.push(['title.alternative', buildTranslationList(alternative && alternative.titlesList)]);

  const otherTitle = research.titles && research.titles.titles && research.titles.titles.OTHER;
  recordEntries.push(['title.other', buildTranslationList(otherTitle && otherTitle.titlesList)]);

  const publicationPlaces = research.publisher && Array.isArray(research.publisher.publicationPlace)
    ? research.publisher.publicationPlace
    : [];
  recordEntries.push(['publication.place', publicationPlaces]);

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

  if (research.resourceType) {
    const formatted = research.resourceType.toLowerCase().replace(/_/g, '.');
    recordEntries.push(['resourcetype.esploro', formatted]);
  }

  const subjectNames = mapSubjectCodes(research.subjectEsploro, subjectTable);
  if (subjectNames.length) {
    recordEntries.push(['subject.esploro', subjectNames]);
  }

  const keywords = buildKeywordObjects(research.keywords);
  if (keywords.length) {
    recordEntries.push(['keywords', keywords]);
  }

  const descriptions = research.descriptions && research.descriptions.assetDescriptions;
  if (descriptions) {
    if (descriptions.ABSTRACT && descriptions.ABSTRACT.descriptions) {
      const abstractEntries = buildTranslationObjects(descriptions.ABSTRACT.descriptions);
      recordEntries.push(['description.abstract', abstractEntries]);
    }
    if (descriptions.BIBLIOGRAPHIC && descriptions.BIBLIOGRAPHIC.descriptions) {
      const bibliographicEntries = buildTranslationObjects(descriptions.BIBLIOGRAPHIC.descriptions);
      recordEntries.push(['description.bibliographic', bibliographicEntries]);
    }
  }

  const localFields = buildLocalFields(research);
  if (Object.keys(localFields).length) {
    recordEntries.push(['local.fields', localFields]);
  }

  recordEntries.push(['esploroDepositPolicy', {}]);

  const record = {};
  for (const [key, value] of recordEntries) {
    if (value === undefined) {
      continue;
    }
    record[key] = value;
  }

  return record;
}

function buildVisibility(visibilityData) {
  return {
    portalVisibility: Boolean(visibilityData.portalVisibility),
    profileVisibility: Boolean(visibilityData.profileVisibility)
  };
}

function stringifyEsploroJson(value) {
  let json = JSON.stringify(value, null, 2);
  
  // Add space after colons
  json = json.replace(/":/g, '" :');
  
  // Format empty objects and arrays
  json = json.replace(/\{\}/g, '{ }');
  json = json.replace(/\[\]/g, '[ ]');
  
  // Remove quotes from numeric mmsId
  json = json.replace(/"mmsId" : "(\d+)"/g, '"mmsId" : $1');
  
  // Collapse simple single-element arrays to one line
  // Match arrays containing a single simple string value (including empty strings)
  json = json.replace(/\[\s*\n\s*"([^"]*)"\s*\n\s*\]/g, '[ "$1" ]');
  
  return `${json}\n`;
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function writeOutputs(records) {
  ensureOutputDir();
  
  // First, determine the maximum version for each MMS ID
  const maxVersions = new Map();
  for (const record of records) {
    const currentMax = maxVersions.get(record.mmsId);
    if (!currentMax || record.version > currentMax) {
      maxVersions.set(record.mmsId, record.version);
    }
  }
  
  // Write each record with appropriate filename
  for (const record of records) {
    const isMaxVersion = record.version === maxVersions.get(record.mmsId);
    const fileName = isMaxVersion
      ? `Asset_Version_${record.mmsId}_Current_Version_${record.version}.json`
      : `Asset_Version_${record.mmsId}_${record.version}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, stringifyEsploroJson(record), 'utf8');
  }
}

function main() {
  const rawInput = fs.readFileSync(INPUT_FILE, 'utf8');
  const parsedRecords = parseData(rawInput);

  const codeTables = loadCodeTables();
  const academicUnits = loadAcademicUnits();
  const accessRights = loadAccessRights();
  const researchOrg = loadResearchOrganizations();
  const orgNamesTable = codeTables.get('ResearchOrganizationUnitsNames') || new Map();
  const subjectTable = codeTables.get('SubjectEsploroFastTerms') || new Map();

  const transformed = parsedRecords.map(record => {
    const accessData = parseJsonSafe(record.accessDataAsJsonString);
    const research = parseJsonSafe(record.researchEntityValueAsJsonString);
    const entityRelations = parseJsonSafe(record.entityRelationsAsJsonString);
    const visibilityData = parseJsonSafe(record.visibilityDataAsJsonString);

    const mmsId = record.version.mmsId;
    const versionNumber = Number(record.version.version);

    const assetOpenAccessRights = buildAssetOpenAccessRights(accessData, accessRights);
    
    return {
      mmsId,
      version: versionNumber,
      createdBy: record.version.createdBy,
      createdDate: formatCreatedDate(record.version.createdDate),
      assetOpenAccessRights: assetOpenAccessRights,
      record: buildRecord(research, entityRelations, academicUnits, orgNamesTable, subjectTable),
      creators: buildCreators(entityRelations.creators),
      contributors: buildContributors(entityRelations.contributors),
      visibility: buildVisibility(visibilityData),
      files: buildFiles(research, accessData, assetOpenAccessRights),
      academicUnits: buildAcademicUnits(
        research.general && research.general.assetAffiliation,
        researchOrg
      )
    };
  });

  writeOutputs(transformed);
}

if (require.main === module) {
  main();
}
