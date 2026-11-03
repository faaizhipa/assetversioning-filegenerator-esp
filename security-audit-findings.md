# Security Audit Findings and PII Identification

## 1. Overview
As part of the initiative to make this repository public, a thorough security audit of the codebase was conducted to identify files containing Personally Identifiable Information (PII) or sensitive internal data, as well as to determine which files are unnecessary for the project to function.

This document outlines the architecture and workflows of the application, documents files containing sensitive information, and identifies unneeded files that should be deleted.

## 2. Architecture and Data Workflow
The repository is designed to parse raw export data from the Esploro database and convert it into structured JSON objects.

### **Key Components and Data Flow:**
1. **Raw Input (`input_1-1000.txt`)**:
   - Contains raw, custom-delimited data export from the database.
   - Delimiter is `|||||`, and rows are separated by `THIS__IS__PEMUTUS__\n`.
   - Includes complex nested columns (like `E**_RELATIONS`, `R**_ENTITY_VALUE`, `MMS_***_VALUE`), which themselves encapsulate stringified JSON objects and XML data.
2. **Parser Module (`convert-from-dsv.js`)**:
   - Responsible for splitting the raw text file string by the custom delimiter and extracting individual fields into a plain object structure.
3. **Lookup Data (`lookup/*.dsv`)**:
   - The application relies on external reference files formatted in DSV (Delimiter-Separated Values). These files map internal system IDs to public-facing human-readable names (e.g., academic units, access rights).
4. **Data Processors (`process-data.js` and `process-assets.js`)**:
   - These act as the primary orchestrators.
   - They load all mapping functions and lookups, run the parser against the input files, process maximum versions (handling duplicates and updates), and use mapping rules derived from `mapping guide.md` to map internal XML/JSON to the final Esploro asset JSON.
   - They output the final JSON records into the `output/` directory.

### **Data Types Handled:**
- `String / CLOB`: Large strings mapped out from the DSV file.
- `JSON`: Stringified JSON embedded inside CSV columns (e.g., representing authors, emails, relationships).
- `XML`: Stringified XML embedded for legacy records.

## 3. Identification of PII and Sensitive Data

The audit revealed that real user data (names, email addresses, and system IDs) is present in the repository.

### **Files Containing PII:**
- **`input_1-1000.txt`**
  - **Emails**: Contains real email addresses (e.g. `m***r@*x.edu`). Found in `E**_RELATIONS` within `t**Supplement` and in `R**_ENTITY_VALUE` under `l**Fields`.
  - **Names**: Contains real researcher/student names (e.g., `Sudah Ditukar`,`Sudah Tertukatr`).
  - **ORCID/Identifiers**: Public but personally identifying IDs are present.

*Note: Since this file serves as test input/example data for the conversion process, it must be scrubbed before making the repo public.*

## 4. Identification of Unneeded Files
The following files are either redundant, internal configuration notes, or intermediate build files that do not belong in a public-facing repository:
1. `Esploro Database Export Scripts and Lookup Table and Input Table Names.md` - Contains internal SQL queries and system configuration details.
2. `Expanded_Esploro_Schema.md` - Contains internal database schemas.
3. `Subject-ANZResearchFields.html`, `Subject-ANZSocio-economicTopic.html`, `Subject-Generic Research Topic.html` - These HTML tables were intermediate files used to create the `.dsv` lookup files and are no longer required.
4. `convert-html-to-dsv.js` - A single-use utility script for parsing the HTML files above.
5. `compare-outputs.js` - An empty script.

## 5. Recommended Mitigation Steps
1. **Remove Unneeded Files**: Delete all files identified in Section 4.
2. **Sanitize Data**: Run a data redaction script against `input_1-1000.txt`.
   - All emails should be replaced with dummy strings like `emailX@email.com`.
   - Identified names and usernames in metadata (like "Rebecca Grant", "rcg22", "Laura", "Caroline") should be replaced with generic placeholders (e.g., "John Doe", "user123").
