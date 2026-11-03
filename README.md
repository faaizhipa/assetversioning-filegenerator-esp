# Drexel Esploro Asset Converter

This project converts Drexel research asset exports (stored as a custom-delimited text file) into individual Esploro-ready JSON payloads that mirror the reference files in `output_actual/`.

## Prerequisites

- **Node.js 18+** (built-in modules only; no external packages required)
- The following input resources in the repository root:
  - `input_1-1000.txt` – custom-delimited source data (PEMUTUS-delimited)
  - Lookup tables inside `lookup/`
    - `code_tables.dsv`
    - `academic_unit.dsv`
    - `access_rights.dsv`
    - `research_organization.dsv`
    - `sdg.dsv`
    - `grants.dsv`
    - `mapping_tables.dsv`
    - `Subject-*.dsv` (multiple subject classification files)

## Project layout

```text
convert-from-dsv.js          # Parser that loads input records with PEMUTUS delimiter
process-data.js              # Main orchestrator that builds Esploro JSON files
process-assets.js            # Alternative processing script
convert-html-to-dsv.js       # Utility to convert HTML tables to DSV format
xml-to-js-object.js          # XML parsing utility
convert-json-to-objects.js   # JSON conversion utility
lookup/                      # Supporting lookup tables (.dsv files)
output/                      # Generated JSON assets (created by the script)
output_actual/               # Reference JSON assets for parity checks
```

## Generating outputs

### Using process-data.js (Recommended)

From the repository root:

```powershell
node process-data.js
```

The script will:

1. Auto-discover the input file (any file with "input" prefix in the root directory)
2. Load all lookup tables from `lookup/` directory
3. Parse the custom PEMUTUS-delimited input file
4. Compute maximum versions for each MMS ID
5. Transform each record and generate JSON files into `output/`
6. Name files as `Asset_Version_{mmsId}_{version}.json` for non-current versions
7. Name files as `Asset_Version_{mmsId}_Current_Version_{version}.json` for current versions

### Using process-assets.js (Legacy)

```powershell
node process-assets.js
```

This alternative script processes the same input data with a different transformation approach.

### Clean output directory

To start fresh, delete the output directory first:

```powershell
Remove-Item -Force -Recurse output
```

## Verifying parity with reference outputs

After generating the JSON files, compare them to the provided benchmarks in `output_actual/`.

```powershell
Get-ChildItem output_actual/*.json |
  ForEach-Object {
    $name = $_.Name
    $actual = $_.FullName
    $generated = Join-Path (Resolve-Path output) $name
    if (Test-Path $generated) {
      Write-Host "Comparing $name"
      cmd /c fc "$actual" "$generated"
    } else {
      Write-Warning "Missing generated file for $name"
    }
  }
```

`fc` emits differences, if any. The goal is for every comparison to report no diff so the generated payloads match the reference structure byte-for-byte.

## Key Features

- **Automatic input file discovery:** `process-data.js` finds any file with "input" prefix
- **Comprehensive lookup system:** Loads SDG, subjects, access rights, research organizations, and more
- **Version tracking:** Automatically identifies and marks the current (maximum) version of each asset
- **Custom JSON formatting:** Matches Esploro's expected JSON structure with proper spacing and field ordering
- **PEMUTUS delimiter support:** Handles multi-line records with custom delimiter (`|||||THIS__IS__PEMUTUS__`)

## Data Transformations

The scripts perform the following transformations:

1. **Version field:** Converts from string to numeric format
2. **Asset license:** Adds `assetLicense: "LUNKNOWN"` to open access rights
3. **Descriptions:** Includes both abstract and bibliographic descriptions
4. **Files metadata:** Adds license code, content type, and rights information
5. **Local fields:** Ensures all 15 local.note fields are present (1-15)
6. **Academic units:** Maps organization codes to full names using lookup tables
7. **Subjects:** Enriches with SDG classifications and subject taxonomies
8. **Deposit policy:** Includes empty `esploroDepositPolicy` object

## Customization tips

- **Lookup overrides:** Adjust lookup tables in the `lookup/` directory to modify mappings
- **Formatting:** `stringifyEsploroJson` in both scripts centralizes the JSON formatting rules
- **New data sources:** The scripts auto-discover input files with "input" prefix in the filename
- **Field mappings:** Refer to `mapping guide.md` for detailed field transformation rules

## Troubleshooting

- **Missing lookup files:** Check that all `.dsv` files exist in the `lookup/` directory with correct extensions
- **Parser errors:** Confirm that input file uses PEMUTUS delimiter (`|||||THIS__IS__PEMUTUS__`)
- **Date formatting:** Scripts expect `DD/MM/YY HH:MM:SS` for created dates and `YYYYMM` or `YYYYMMDD` for display dates
- **File not found errors:** Ensure all lookup files use `.dsv` extension, not `.txt`
- **Version numbers:** Version field is converted to numeric (integer) format in output
