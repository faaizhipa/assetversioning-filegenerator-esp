Data Mapping Guide: Source Objects to assetData
This document provides a comprehensive guide for mapping the source JavaScript objects (researchEntityValue, entityRelations, visibility_data, access_data) to the target assetData object. This process involves both direct data copying and lookups for converting codes and IDs into human-readable values.

Section 1: Root Level Data
|

| Target Field in assetData | Source Field / Logic | Notes / Transformation |
| mmsId | version.mmsId | Direct copy. |
| version | version.version | Direct copy |
| createdBy | version.createdBy | Direct copy  |
| createdDate | version.createdDate | Direct copy. Requires formatting from "DD/MM/YY HH:MM:SS.SSSSSSSSS AM/PM GMT" to "YYYY-MM-DD". |

Section 2: assetOpenAccessRights Object
| Target Field in assetData | Source Field / Logic | Notes / Transformation |
| assetOpenAccessRights.openAccessStatus | access_data.openAccessStatus | Direct copy. |
| assetOpenAccessRights.openAccess | access_data.openAccess | Convert value to lowercase ("YES" to "yes"). |
| assetOpenAccessRights.assetLicense | access_data.licenseCode | Direct copy. |
| assetOpenAccessRights.accessRights | access_data.accessRightsPolicyId | Lookup Required: Use the numeric ID to query a policy system and retrieve the human-readable policy name (e.g., "Access for Libero"). |

Section 3: record Object (Core Metadata)
This is the largest section, primarily sourced from researchEntityValue.

| Target Field in assetData | Source Field / Logic | Notes / Transformation |
| record.title | researchEntityValue.titles.titles.MAIN.titlesList.translationMap.und[0] | Direct copy of the main title. |
| record.publisher | researchEntityValue.publisher.publisherName | Direct copy. |
| record.openaccess | researchEntityValue.access.openAccess | Convert value to lowercase ("YES" to "yes"). |
| record.openAccessStatus | researchEntityValue.access.openAccessStatus | Direct copy. |
| record.peerreview | researchEntityValue.access.peerReview | Convert value to lowercase ("NO" to "no"). |
| record.copyright | researchEntityValue.access.copyright | Direct copy. |
| record.language | researchEntityValue.general.language | Direct copy of the array. |
| record.displayedDateByPriorityEsploroCP | researchEntityValue.dates.assetDates.DATE_PUBLISHED.datesList[0] | Format from YYYYMM to MM/YYYY. |
| record['identifier.doi'] | researchEntityValue.identifiers.assetIdentifiers.DOI[0] | Direct copy. |
| record['identifier.pmid'] | researchEntityValue.identifiers.assetIdentifiers.PMID[0] | Direct copy. |
| record['identifier.pmcid'] | researchEntityValue.identifiers.assetIdentifiers.PMCID[0] | Direct copy. |
| record['identifier.handle'] | researchEntityValue.identifiers.assetIdentifiers.HANDLE[0] | Direct copy. |
| record['identifier.additional02'] | researchEntityValue.identifiers.assetIdentifiers.ADDITIONAL02[0] | Direct copy. |
| record['identifier.additional04'] | researchEntityValue.identifiers.assetIdentifiers.ADDITIONAL04[0] | Direct copy. |
| record['title.subtitle'] | researchEntityValue.titles.titles.MAIN.subTitlesList.translationMap.und[0] | Direct copy. |
| record['title.alternative'] | researchEntityValue.titles.titles.ALTERNATIVE.titlesList.translationMap.und | Direct copy of the array. |
| record['date.presented'] | researchEntityValue.dates.assetDates.DATE_PRESENTED.datesList[0] | Direct copy. |
| record['date.published'] | researchEntityValue.dates.assetDates.DATE_PUBLISHED.datesList[0] | Direct copy. |
| record['resourcetype.esploro'] | researchEntityValue.resourceType | Format from PUBLICATION_JOURNAL_ARTICLE to publication.journalArticle. |
| record['subject.esploro'] | researchEntityValue.subjectEsploro | Lookup Required: Use the numeric codes to query a subject directory and retrieve the descriptive subject names (e.g., "Molecular Biochemistry"). |
| record.keywords | researchEntityValue.keywords.translationMap | Transform from { "eng": ["val1", "val2"] } to [{ "language": "eng", "values": ["val1", "val2"] }]. |
| record.sdg | researchEntityValue.sdgList | Lookup Required: Use a mapping table to convert SDG codes (e.g., "SDG02") into their full names (e.g., "02 Zero Hunger"). |
| record['description.abstract'] | researchEntityValue.descriptions.assetDescriptions.ABSTRACT.descriptions.translationMap | Transform from { "eng": ["text"] } to [{ "language": "eng", "value": "text" }]. |
| record.comment | researchEntityValue.general.comments | Direct copy of the array. |
| record['local.fields'] | researchEntityValue.localFields.fields | Iterate through the object, transforming fields["1"].fieldValue to local.fields['local.note1']. |
| record['grants.note'] | researchEntityValue.general.grantsNote | Direct copy. |

Section 4: record.relationships Array
This array is constructed from the publicationDetails object.

| Target Field in assetData | Source Field / Logic |
| relationships[0].relationtype | Hardcoded value: "ispartof" |
| relationships[0].relationtitle | researchEntityValue.publicationDetails.title |
| relationships[0].issue | researchEntityValue.publicationDetails.issue |
| relationships[0].volume | researchEntityValue.publicationDetails.volume |
| relationships[0].epage | researchEntityValue.publicationDetails.epage |
| relationships[0].spage | researchEntityValue.publicationDetails.spage |
| relationships[0]['article.number'] | researchEntityValue.publicationDetails.articleNumber |
| relationships[0]['identifier.eissn'] | researchEntityValue.publicationDetails.identifierEissn |
| relationships[0]['identifier.issn'] | researchEntityValue.publicationDetails.identifierIssn |
| relationships[0]['identifier.isbn'] | researchEntityValue.publicationDetails.identifierIsbn |
| relationships[0]['nlm.abbrev'] | researchEntityValue.publicationDetails.nlmAbbrev |

Section 5: creators and contributors Arrays
These are sourced from entityRelations and require parsing the targetSupplement string.

| Target Field in assetData | Source Field / Logic |
| creators[*].familyName | JSON.parse(entityRelations.creators[*].targetSupplement).publishedLastName |
| creators[*].givenName | JSON.parse(entityRelations.creators[*].targetSupplement).publishedFirstName |
| creators[*].middleName | JSON.parse(entityRelations.creators[*].targetSupplement).publishedMiddleName |
| creators[*].suffix | JSON.parse(entityRelations.creators[*].targetSupplement).publishedNameSuffix |
| creators[*].order | entityRelations.creators[*].order |
| creators[*].role | JSON.parse(entityRelations.creators[*].targetSupplement).publisherRole |
| creators[*].almaUserId | entityRelations.creators[*].targetEntityId |
| contributors[*].familyName | JSON.parse(entityRelations.contributors[*].targetSupplement).publishedLastName |
| contributors[*].groupAuthorName | JSON.parse(entityRelations.contributors[*].targetSupplement).organizationName |
| (...and so on for other contributor fields) |  |

Section 6: Remaining Top-Level Objects and Arrays
| Target Field in assetData | Source Field / Logic | Notes / Transformation |
| visibility | visibility_data | Direct assignment of the entire object. |
| files[*].fileName | researchEntityValue.filesModel.files[*].fileOriginalName | Iterate through the filesModel.files array. |
| files[*].fileDisplayName | researchEntityValue.filesModel.files[*].fileDisplayName |  |
| files[*].fileLicenseCode | researchEntityValue.filesModel.files[*].licenseEsploroCode |  |
| files[*].fileContentType | researchEntityValue.filesModel.files[*].fileTypeEsploroCode |  |
| files[*].fileRights | researchEntityValue.filesModel.files[*].accessRightsEsploroPolicyId | Lookup Required: For each file, use the numeric ID to query a policy system and retrieve the human-readable rights description (e.g., "Embargo"). |
| files[*].fileOrder | researchEntityValue.filesModel.files[*].fileOrder |  |
| files[*].fileSupplemental | researchEntityValue.filesModel.files[*].fileSupplementalEsploro |  |
| files[*].fileSize | researchEntityValue.filesModel.files[*].fileSizeBytes |  |
| academicUnits | researchEntityValue.general.assetAffiliation and entityRelations.organizations | Lookup Required: Use the codes and object IDs to query an organizational directory and retrieve a list of full academic unit names. |
| grants[*].grantId | entityRelations.grants[*].targetEntityId | Lookup Required: Use the targetEntityId to query a grants management system and retrieve the public-facing grant ID. |
| relatedAssets | entityRelations.assets | Iterate and map fields. Transform relationType to lowercase (e.g., HASPREPRINT to haspreprint). |